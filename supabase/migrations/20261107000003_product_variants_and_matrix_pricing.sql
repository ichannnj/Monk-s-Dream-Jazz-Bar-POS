-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Product Variants & Matrix Pricing for Coffee / Drinks
-- Migration: 20261107000003_product_variants_and_matrix_pricing.sql
-- ==============================================================================

-- 1. Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  temperature TEXT NOT NULL CHECK (temperature IN ('HOT', 'COLD', 'ROOM', 'NONE')) DEFAULT 'NONE',
  size_label TEXT NOT NULL DEFAULT 'Standard',
  price NUMERIC(10, 2) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sku TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: each product can only have one price for a specific temp + size combo
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique 
  ON public.product_variants(product_id, temperature, size_label);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id 
  ON public.product_variants(product_id);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'Allow public read access on product_variants'
  ) THEN
    CREATE POLICY "Allow public read access on product_variants" 
      ON public.product_variants FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'Allow all write on product_variants'
  ) THEN
    CREATE POLICY "Allow all write on product_variants" 
      ON public.product_variants FOR ALL USING (true);
  END IF;
END $$;

-- Enable Realtime for product_variants
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add variant fields to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS temperature TEXT,
  ADD COLUMN IF NOT EXISTS size_label TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- 3. Enhance product_ingredients for Granular BOM per Variant
ALTER TABLE public.product_ingredients
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_ingredients_variant_id ON public.product_ingredients(variant_id);

-- Safely drop old unique constraint if present
ALTER TABLE public.product_ingredients 
  DROP CONSTRAINT IF EXISTS product_ingredients_product_id_inventory_item_id_key;

-- Create scoped unique index (product_id, variant_id or sentinel, inventory_item_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ingredients_unique_scoped 
  ON public.product_ingredients(
    product_id, 
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    inventory_item_id
  );

-- 4. Update fn_deplete_inventory_on_item_ready() to support variant-specific BOM with base BOM fallback
CREATE OR REPLACE FUNCTION public.fn_deplete_inventory_on_item_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing RECORD;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_deduction NUMERIC;
  v_has_variant_bom BOOLEAN := false;
BEGIN
  -- Only deplete when transitioning to READY or SERVED and not already depleted
  IF (NEW.status IN ('READY', 'SERVED') 
      AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('READY', 'SERVED')) 
      AND NEW.is_depleted = false) THEN

    -- Check if this item has a variant-specific BOM defined
    IF NEW.variant_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.product_ingredients
        WHERE variant_id = NEW.variant_id
      ) INTO v_has_variant_bom;
    END IF;

    IF v_has_variant_bom THEN
      -- Deplete variant-specific BOM
      FOR v_ing IN
        SELECT 
          pi.inventory_item_id, 
          pi.amount, 
          pi.conversion_factor,
          ii.current_stock AS stock_now
        FROM public.product_ingredients pi
        JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
        WHERE pi.variant_id = NEW.variant_id
      LOOP
        SELECT current_stock INTO v_balance_before
        FROM public.inventory_items
        WHERE id = v_ing.inventory_item_id
        FOR UPDATE;

        IF FOUND THEN
          v_deduction := (v_ing.amount * NEW.quantity * v_ing.conversion_factor);
          v_current_stock := v_balance_before - v_deduction;

          UPDATE public.inventory_items
          SET current_stock = v_current_stock, updated_at = now()
          WHERE id = v_ing.inventory_item_id;

          INSERT INTO public.stock_movements (
            inventory_item_id,
            movement_type,
            change_amount,
            balance_before,
            balance_after,
            reference_id
          ) VALUES (
            v_ing.inventory_item_id,
            'SALE_DEPLETION',
            -v_deduction,
            v_balance_before,
            v_current_stock,
            NEW.order_id::text
          );
        END IF;
      END LOOP;
    ELSE
      -- Fallback to product's base BOM
      FOR v_ing IN
        SELECT 
          pi.inventory_item_id, 
          pi.amount, 
          pi.conversion_factor,
          ii.current_stock AS stock_now
        FROM public.product_ingredients pi
        JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
        WHERE pi.product_id = NEW.product_id
          AND pi.variant_id IS NULL
      LOOP
        SELECT current_stock INTO v_balance_before
        FROM public.inventory_items
        WHERE id = v_ing.inventory_item_id
        FOR UPDATE;

        IF FOUND THEN
          v_deduction := (v_ing.amount * NEW.quantity * v_ing.conversion_factor);
          v_current_stock := v_balance_before - v_deduction;

          UPDATE public.inventory_items
          SET current_stock = v_current_stock, updated_at = now()
          WHERE id = v_ing.inventory_item_id;

          INSERT INTO public.stock_movements (
            inventory_item_id,
            movement_type,
            change_amount,
            balance_before,
            balance_after,
            reference_id
          ) VALUES (
            v_ing.inventory_item_id,
            'SALE_DEPLETION',
            -v_deduction,
            v_balance_before,
            v_current_stock,
            NEW.order_id::text
          );
        END IF;
      END LOOP;
    END IF;

    NEW.is_depleted := true;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Seed realistic variants for existing coffee items
DO $$
DECLARE
  v_flat_white_id UUID;
  v_v60_id UUID;
  v_cold_brew_id UUID;
BEGIN
  -- Flat White
  SELECT id INTO v_flat_white_id FROM public.products WHERE name = 'Flat White' LIMIT 1;
  IF v_flat_white_id IS NOT NULL THEN
    INSERT INTO public.product_variants (product_id, temperature, size_label, price, sort_order)
    VALUES
      (v_flat_white_id, 'HOT', '8oz', 180.00, 1),
      (v_flat_white_id, 'HOT', '12oz', 200.00, 2),
      (v_flat_white_id, 'COLD', '12oz', 210.00, 3),
      (v_flat_white_id, 'COLD', '16oz', 230.00, 4)
    ON CONFLICT (product_id, temperature, size_label) 
    DO UPDATE SET price = EXCLUDED.price;
  END IF;

  -- V60 Pour Over
  SELECT id INTO v_v60_id FROM public.products WHERE name = 'V60 Pour Over' LIMIT 1;
  IF v_v60_id IS NOT NULL THEN
    INSERT INTO public.product_variants (product_id, temperature, size_label, price, sort_order)
    VALUES
      (v_v60_id, 'HOT', '12oz', 220.00, 1),
      (v_v60_id, 'COLD', '12oz', 240.00, 2)
    ON CONFLICT (product_id, temperature, size_label) 
    DO UPDATE SET price = EXCLUDED.price;
  END IF;

  -- Cold Brew
  SELECT id INTO v_cold_brew_id FROM public.products WHERE name = 'Cold Brew' LIMIT 1;
  IF v_cold_brew_id IS NOT NULL THEN
    INSERT INTO public.product_variants (product_id, temperature, size_label, price, sort_order)
    VALUES
      (v_cold_brew_id, 'COLD', '12oz', 200.00, 1),
      (v_cold_brew_id, 'COLD', '16oz', 230.00, 2)
    ON CONFLICT (product_id, temperature, size_label) 
    DO UPDATE SET price = EXCLUDED.price;
  END IF;
END $$;

