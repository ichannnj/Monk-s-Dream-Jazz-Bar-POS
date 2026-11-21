-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Seed Standard Drink Add-Ons for Coffee & Non-Coffee
-- Migration: 20261121000002_seed_drink_addons_modifiers.sql
-- ==============================================================================
-- 1. Moves "Mocha with Dark Chocolate Cold Foam" from Door Charge to Specialty Coffee.
-- 2. Replaces legacy coffee modifiers on all Specialty Coffee, Non-Coffee, and Matcha
--    drinks with the 5 standard add-ons:
--      - Espresso Shot (Php 50.00)
--      - Syrup         (Php 30.00)
--      - Breve         (Php 60.00)
--      - Oat Milk      (Php 60.00)
--      - Almond Milk   (Php 60.00)

DO $$
DECLARE
  v_coffee_cat_id UUID;
  v_prod RECORD;
  v_addon RECORD;
BEGIN
  -- 1. Resolve Specialty Coffee category and fix Mocha with Dark Chocolate Cold Foam category
  SELECT id INTO v_coffee_cat_id
  FROM public.categories
  WHERE slug = 'coffee' OR lower(name) = 'specialty coffee'
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_coffee_cat_id IS NOT NULL THEN
    UPDATE public.products
    SET category_id = v_coffee_cat_id,
        updated_at = now()
    WHERE id = '9487921e-5027-4ff1-a6cf-d973518b06c1'
      AND category_id <> v_coffee_cat_id;
  END IF;

  -- 2. Apply the 5 standard drink add-ons to all Coffee, Non-Coffee, and Matcha drinks
  FOR v_prod IN
    SELECT p.id
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    WHERE c.slug IN ('coffee', 'non-coffee', 'matcha')
       OR lower(c.name) IN ('specialty coffee', 'coffee', 'non-coffee', 'matcha')
  LOOP
    -- Remove any legacy modifiers not in the 5 standard add-ons
    DELETE FROM public.product_modifiers
    WHERE product_id = v_prod.id
      AND name NOT IN ('Espresso Shot', 'Syrup', 'Breve', 'Oat Milk', 'Almond Milk');

    -- Ensure each of the 5 standard add-ons exists with exact pricing
    FOR v_addon IN
      SELECT * FROM (
        VALUES
          ('Espresso Shot', 50.00::NUMERIC),
          ('Syrup',         30.00::NUMERIC),
          ('Breve',         60.00::NUMERIC),
          ('Oat Milk',      60.00::NUMERIC),
          ('Almond Milk',   60.00::NUMERIC)
      ) AS t(addon_name, addon_price)
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.product_modifiers
        WHERE product_id = v_prod.id AND name = v_addon.addon_name
      ) THEN
        UPDATE public.product_modifiers
        SET price_delta = v_addon.addon_price,
            applicable_category = 'all'
        WHERE product_id = v_prod.id AND name = v_addon.addon_name;
      ELSE
        INSERT INTO public.product_modifiers (
          product_id,
          group_id,
          name,
          price_delta,
          applicable_category,
          inventory_item_id,
          amount_delta,
          unit
        ) VALUES (
          v_prod.id,
          NULL,
          v_addon.addon_name,
          v_addon.addon_price,
          'all',
          NULL,
          0,
          NULL
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
