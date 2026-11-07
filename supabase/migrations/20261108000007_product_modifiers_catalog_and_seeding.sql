-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Product Modifiers Master Catalog & Auto-Assignment
-- Migration: 20261108000007_product_modifiers_catalog_and_seeding.sql
-- Description:
--   1. Enhances modifier_groups and product_modifiers with applicable_category.
--   2. Seeds comprehensive master modifier catalog (Coffee, Cocktails/Liquor,
--      Pasta/Mains, Small Plates/Bites, Desserts) with Philippine Peso add-on prices.
--   3. Auto-assigns matching category modifiers to all existing menu products.
--   4. Updates fn_deplete_inventory_on_item_ready() to deplete modifier ingredients.
-- ==============================================================================

-- 1. Schema Extensions
ALTER TABLE public.modifier_groups
  ADD COLUMN IF NOT EXISTS applicable_category TEXT NOT NULL DEFAULT 'all';

ALTER TABLE public.product_modifiers
  ADD COLUMN IF NOT EXISTS applicable_category TEXT NOT NULL DEFAULT 'all';

CREATE INDEX IF NOT EXISTS idx_product_modifiers_product_id 
  ON public.product_modifiers(product_id);

CREATE INDEX IF NOT EXISTS idx_product_modifiers_applicable_category 
  ON public.product_modifiers(applicable_category);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_applicable_category 
  ON public.modifier_groups(applicable_category);

-- 2. Seed Master Modifier Groups across Domain Categories
INSERT INTO public.modifier_groups (id, name, product_id, min_selections, max_selections, is_required, sort_order, applicable_category)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Milk & Dairy Selection', NULL, 0, 1, false, 1, 'coffee'),
  ('20000000-0000-0000-0000-000000000002', 'Espresso Shots & Syrups', NULL, 0, 3, false, 2, 'coffee'),
  ('20000000-0000-0000-0000-000000000004', 'Cocktail Pours & Ice Service', NULL, 0, 2, false, 3, 'cocktails_wine'),
  ('20000000-0000-0000-0000-000000000005', 'Bitters, Mixers & Garnishes', NULL, 0, 3, false, 4, 'cocktails_wine'),
  ('20000000-0000-0000-0000-000000000003', 'Kitchen & Pasta Add-ons', NULL, 0, 4, false, 5, 'mains_pasta'),
  ('20000000-0000-0000-0000-000000000006', 'Bar Bites Dips & Extras', NULL, 0, 3, false, 6, 'small_plates'),
  ('20000000-0000-0000-0000-000000000007', 'Dessert Finishes & Gelato', NULL, 0, 2, false, 7, 'desserts')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  applicable_category = EXCLUDED.applicable_category;

-- 3. Seed Master Modifier Catalog Options (product_id IS NULL)
-- Coffee Modifiers
INSERT INTO public.product_modifiers (id, product_id, group_id, name, price_delta, inventory_item_id, amount_delta, unit, applicable_category)
VALUES
  ('30000000-0000-0000-0000-000000000001', NULL, '20000000-0000-0000-0000-000000000001', 'Barista Oat Milk', 50.00, 'b1000003-0000-0000-0000-000000000003', 0.200, 'L', 'coffee'),
  ('30000000-0000-0000-0000-000000000002', NULL, '20000000-0000-0000-0000-000000000001', 'Whole Dairy Milk', 0.00, 'b1000004-0000-0000-0000-000000000004', 0.200, 'L', 'coffee'),
  ('30000000-0000-0000-0000-000000000011', NULL, '20000000-0000-0000-0000-000000000001', 'Sub Soy / Almond Milk', 45.00, NULL, 0.000, NULL, 'coffee'),
  ('30000000-0000-0000-0000-000000000004', NULL, '20000000-0000-0000-0000-000000000002', 'Extra House Espresso Shot', 40.00, 'b1000001-0000-0000-0000-000000000001', 0.018, 'kg', 'coffee'),
  ('30000000-0000-0000-0000-000000000003', NULL, '20000000-0000-0000-0000-000000000002', 'Single Origin Ethiopia Shot', 60.00, 'b1000002-0000-0000-0000-000000000002', 0.018, 'kg', 'coffee'),
  ('30000000-0000-0000-0000-000000000012', NULL, '20000000-0000-0000-0000-000000000002', 'Madagascar Vanilla Syrup', 35.00, NULL, 0.000, NULL, 'coffee'),
  ('30000000-0000-0000-0000-000000000013', NULL, '20000000-0000-0000-0000-000000000002', 'Salted Caramel Syrup', 35.00, NULL, 0.000, NULL, 'coffee'),
  ('30000000-0000-0000-0000-000000000014', NULL, '20000000-0000-0000-0000-000000000002', 'Roasted Hazelnut Syrup', 35.00, NULL, 0.000, NULL, 'coffee'),
  ('30000000-0000-0000-0000-000000000015', NULL, '20000000-0000-0000-0000-000000000002', 'Cold Foam Topping', 45.00, NULL, 0.000, NULL, 'coffee'),

-- Cocktails & Liquor Modifiers
  ('30000000-0000-0000-0000-000000000021', NULL, '20000000-0000-0000-0000-000000000004', 'Double Spirit Pour (60ml)', 180.00, NULL, 0.000, NULL, 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000022', NULL, '20000000-0000-0000-0000-000000000004', 'Top-Shelf Spirit Upgrade', 150.00, NULL, 0.000, NULL, 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000023', NULL, '20000000-0000-0000-0000-000000000004', 'Artisan Clear Ice Sphere', 30.00, NULL, 0.000, NULL, 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000024', NULL, '20000000-0000-0000-0000-000000000005', 'Smoked Rosemary & Wood Chip', 50.00, NULL, 0.000, NULL, 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000025', NULL, '20000000-0000-0000-0000-000000000005', 'Absinthe Rinse', 70.00, 'b1000011-0000-0000-0000-000000000011', 0.010, 'pcs', 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000026', NULL, '20000000-0000-0000-0000-000000000005', 'Extra Peychauds Bitters', 30.00, 'b1000012-0000-0000-0000-000000000012', 0.010, 'pcs', 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000027', NULL, '20000000-0000-0000-0000-000000000005', 'Fever-Tree Premium Tonic', 85.00, NULL, 0.000, NULL, 'cocktails_wine'),
  ('30000000-0000-0000-0000-000000000028', NULL, '20000000-0000-0000-0000-000000000005', 'Flamed Orange Peel & Cherry', 25.00, NULL, 0.000, NULL, 'cocktails_wine'),

-- Pasta & Mains Modifiers
  ('30000000-0000-0000-0000-000000000005', NULL, '20000000-0000-0000-0000-000000000003', 'Extra Truffle Drizzle', 80.00, 'b1000017-0000-0000-0000-000000000017', 0.005, 'L', 'mains_pasta'),
  ('30000000-0000-0000-0000-000000000031', NULL, '20000000-0000-0000-0000-000000000003', 'Aged Parmigiano Reggiano DOP', 60.00, 'b1000016-0000-0000-0000-000000000016', 0.025, 'kg', 'mains_pasta'),
  ('30000000-0000-0000-0000-000000000032', NULL, '20000000-0000-0000-0000-000000000003', 'Crispy Cured Guanciale', 90.00, 'b1000013-0000-0000-0000-000000000013', 0.040, 'kg', 'mains_pasta'),
  ('30000000-0000-0000-0000-000000000033', NULL, '20000000-0000-0000-0000-000000000003', 'Fresh Mozzarella Di Bufala', 100.00, 'b1000020-0000-0000-0000-000000000020', 0.060, 'kg', 'mains_pasta'),
  ('30000000-0000-0000-0000-000000000006', NULL, '20000000-0000-0000-0000-000000000003', 'Farm Fresh Egg', 35.00, 'b1000015-0000-0000-0000-000000000015', 1.000, 'pcs', 'mains_pasta'),
  ('30000000-0000-0000-0000-000000000034', NULL, '20000000-0000-0000-0000-000000000003', 'Warm Artisan Ciabatta Bread', 70.00, 'b1000021-0000-0000-0000-000000000021', 1.000, 'pcs', 'mains_pasta'),
  ('30000000-0000-0000-0000-000000000035', NULL, '20000000-0000-0000-0000-000000000003', 'Fresh Baby Arugula Topping', 45.00, 'b1000023-0000-0000-0000-000000000023', 0.020, 'kg', 'mains_pasta'),

-- Small Plates & Bites Modifiers
  ('30000000-0000-0000-0000-000000000041', NULL, '20000000-0000-0000-0000-000000000006', 'Truffle Aioli Dip', 50.00, 'b1000017-0000-0000-0000-000000000017', 0.003, 'L', 'small_plates'),
  ('30000000-0000-0000-0000-000000000042', NULL, '20000000-0000-0000-0000-000000000006', 'Melted Provolone Blanket', 65.00, 'b1000022-0000-0000-0000-000000000022', 0.030, 'kg', 'small_plates'),
  ('30000000-0000-0000-0000-000000000043', NULL, '20000000-0000-0000-0000-000000000006', 'Extra Crispy Guanciale Bits', 85.00, 'b1000013-0000-0000-0000-000000000013', 0.035, 'kg', 'small_plates'),
  ('30000000-0000-0000-0000-000000000044', NULL, '20000000-0000-0000-0000-000000000006', 'Extra Warm Ciabatta Toast', 60.00, 'b1000021-0000-0000-0000-000000000021', 1.000, 'pcs', 'small_plates'),

-- Desserts & Pastries Modifiers
  ('30000000-0000-0000-0000-000000000051', NULL, '20000000-0000-0000-0000-000000000007', 'Vanilla Bean Gelato Scoop', 80.00, NULL, 0.000, NULL, 'desserts'),
  ('30000000-0000-0000-0000-000000000052', NULL, '20000000-0000-0000-0000-000000000007', 'Espresso Affogato Pour', 55.00, 'b1000001-0000-0000-0000-000000000001', 0.018, 'kg', 'desserts'),
  ('30000000-0000-0000-0000-000000000053', NULL, '20000000-0000-0000-0000-000000000007', 'Whipped Mascarpone Cream', 50.00, NULL, 0.000, NULL, 'desserts'),
  ('30000000-0000-0000-0000-000000000054', NULL, '20000000-0000-0000-0000-000000000007', 'Warm & Toasted Service', 0.00, NULL, 0.000, NULL, 'desserts')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  applicable_category = EXCLUDED.applicable_category,
  inventory_item_id = EXCLUDED.inventory_item_id,
  amount_delta = EXCLUDED.amount_delta,
  unit = EXCLUDED.unit;

-- 4. Auto-Assign Matching Category Modifiers to All Existing Menu Products
DO $$
DECLARE
  v_prod RECORD;
  v_tpl RECORD;
  v_cat_slug TEXT;
BEGIN
  FOR v_prod IN 
    SELECT p.id, p.name, c.slug AS cat_slug, c.name AS cat_name
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
  LOOP
    -- Normalize target category slug
    IF v_prod.cat_slug = 'coffee' OR lower(v_prod.cat_name) LIKE '%coffee%' OR lower(v_prod.name) LIKE '%espresso%' OR lower(v_prod.name) LIKE '%latte%' OR lower(v_prod.name) LIKE '%brew%' THEN
      v_cat_slug := 'coffee';
    ELSIF v_prod.cat_slug = 'cocktails_wine' OR lower(v_prod.cat_name) LIKE '%cocktail%' OR lower(v_prod.cat_name) LIKE '%wine%' OR lower(v_prod.name) LIKE '%negroni%' OR lower(v_prod.name) LIKE '%martini%' OR lower(v_prod.name) LIKE '%sazerac%' THEN
      v_cat_slug := 'cocktails_wine';
    ELSIF v_prod.cat_slug = 'mains_pasta' OR lower(v_prod.cat_name) LIKE '%pasta%' OR lower(v_prod.cat_name) LIKE '%main%' OR lower(v_prod.name) LIKE '%carbonara%' OR lower(v_prod.name) LIKE '%pizza%' OR lower(v_prod.name) LIKE '%panini%' THEN
      v_cat_slug := 'mains_pasta';
    ELSIF v_prod.cat_slug = 'small_plates' OR lower(v_prod.cat_name) LIKE '%small%' OR lower(v_prod.cat_name) LIKE '%plate%' OR lower(v_prod.cat_name) LIKE '%bite%' THEN
      v_cat_slug := 'small_plates';
    ELSIF v_prod.cat_slug = 'desserts' OR lower(v_prod.cat_name) LIKE '%dessert%' OR lower(v_prod.cat_name) LIKE '%pastry%' OR lower(v_prod.name) LIKE '%croissant%' OR lower(v_prod.name) LIKE '%cake%' THEN
      v_cat_slug := 'desserts';
    ELSE
      v_cat_slug := 'all';
    END IF;

    -- Attach master modifiers for this category if not already present on product
    FOR v_tpl IN
      SELECT *
      FROM public.product_modifiers
      WHERE product_id IS NULL 
        AND (applicable_category = v_cat_slug OR applicable_category = 'all')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.product_modifiers 
        WHERE product_id = v_prod.id AND name = v_tpl.name
      ) THEN
        INSERT INTO public.product_modifiers (
          product_id, group_id, name, price_delta, inventory_item_id, amount_delta, unit, applicable_category
        ) VALUES (
          v_prod.id, v_tpl.group_id, v_tpl.name, v_tpl.price_delta, v_tpl.inventory_item_id, v_tpl.amount_delta, v_tpl.unit, v_tpl.applicable_category
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 5. Enhanced Inventory Depletion Trigger Function: Supports Recipe BOM + Selected Modifiers
CREATE OR REPLACE FUNCTION public.fn_deplete_inventory_on_item_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing RECORD;
  v_mod RECORD;
  v_mod_text TEXT;
  v_clean_mod_name TEXT;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_deduction NUMERIC;
BEGIN
  -- Only deplete when transitioning to READY or SERVED and not already depleted
  IF (NEW.status IN ('READY', 'SERVED') 
      AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('READY', 'SERVED')) 
      AND NEW.is_depleted = false) THEN

    -- A. Deplete Base Recipe Ingredients
    FOR v_ing IN
      SELECT 
        pi.inventory_item_id, 
        pi.amount, 
        pi.conversion_factor,
        ii.current_stock AS stock_now
      FROM public.product_ingredients pi
      JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
      WHERE pi.product_id = NEW.product_id
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

    -- B. Deplete Selected Modifiers (if linked to inventory)
    IF NEW.modifiers IS NOT NULL AND jsonb_array_length(NEW.modifiers) > 0 THEN
      FOR v_mod_text IN SELECT jsonb_array_elements_text(NEW.modifiers)
      LOOP
        -- Strip price suffix like " (+₱50.00)" if present to match modifier name
        v_clean_mod_name := regexp_replace(v_mod_text, '\s*\(\+₱[0-9.,]+\)$', '');

        FOR v_mod IN
          SELECT pm.inventory_item_id, pm.amount_delta, ii.current_stock AS stock_now
          FROM public.product_modifiers pm
          JOIN public.inventory_items ii ON ii.id = pm.inventory_item_id
          WHERE (pm.product_id = NEW.product_id OR pm.product_id IS NULL)
            AND pm.name = v_clean_mod_name
            AND pm.inventory_item_id IS NOT NULL
            AND pm.amount_delta > 0
          LIMIT 1
        LOOP
          SELECT current_stock INTO v_balance_before
          FROM public.inventory_items
          WHERE id = v_mod.inventory_item_id
          FOR UPDATE;

          IF FOUND THEN
            v_deduction := (v_mod.amount_delta * NEW.quantity);
            v_current_stock := v_balance_before - v_deduction;

            UPDATE public.inventory_items
            SET current_stock = v_current_stock, updated_at = now()
            WHERE id = v_mod.inventory_item_id;

            INSERT INTO public.stock_movements (
              inventory_item_id,
              movement_type,
              change_amount,
              balance_before,
              balance_after,
              reference_id
            ) VALUES (
              v_mod.inventory_item_id,
              'SALE_DEPLETION',
              -v_deduction,
              v_balance_before,
              v_current_stock,
              NEW.order_id::text || ' (MOD: ' || v_clean_mod_name || ')'
            );
          END IF;
        END LOOP;
      END LOOP;
    END IF;

    NEW.is_depleted := true;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

