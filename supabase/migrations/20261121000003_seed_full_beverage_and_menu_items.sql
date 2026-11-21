-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Seed Full Menu & Beverage Catalog (Page 5 + Fixes)
-- Migration: 20261121000003_seed_full_beverage_and_menu_items.sql
-- ==============================================================================
-- 1. Creates beverage & bar categories:
--      Other Beverages, House Wine, Single Shots, Beer
-- 2. Seeds all 16 items from Menu Page 5 with exact PHP prices, size variants
--    (Soda in Can: Mini 80 / Regular 120), and 0-cost choice modifiers
--    (Coke / Sprite, Sip Smith / Tanqueray).
-- 3. Aligns existing item descriptions & station targets with printed menu:
--      - MONK’S I ❤ NYC, Pizza Blanca, Bolognese, Monk's Salad, Matcha Latte
--      - Rice -> station_target = 'kitchen'
--      - Removes stray legacy coffee modifiers from Sausage Platter

DO $$
DECLARE
  v_cat_other_bev UUID;
  v_cat_wine      UUID;
  v_cat_shots     UUID;
  v_cat_beer      UUID;
  v_soda_id       UUID;
  v_gin_id        UUID;
BEGIN
  -- 1. Upsert Categories
  INSERT INTO public.categories (name, slug, sort_order)
  VALUES ('Other Beverages', 'other-beverages', 10)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING id INTO v_cat_other_bev;

  INSERT INTO public.categories (name, slug, sort_order)
  VALUES ('House Wine', 'house-wine', 11)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING id INTO v_cat_wine;

  INSERT INTO public.categories (name, slug, sort_order)
  VALUES ('Single Shots', 'single-shots', 12)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING id INTO v_cat_shots;

  INSERT INTO public.categories (name, slug, sort_order)
  VALUES ('Beer', 'beer', 13)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING id INTO v_cat_beer;

  -- 2. Seed OTHER BEVERAGES (station_target = 'bar')
  INSERT INTO public.products (category_id, name, description, base_price, station_target, is_available)
  VALUES
    (v_cat_other_bev, 'Bottled Water',            '', 100.00, 'bar', true),
    (v_cat_other_bev, 'Soda in Can (Coke, Sprite)', 'Available in Mini (Php 80.00) or Regular (Php 120.00)', 80.00, 'bar', true),
    (v_cat_other_bev, 'Soda Water',               '', 120.00, 'bar', true),
    (v_cat_other_bev, 'Tonic Water',              '', 150.00, 'bar', true),
    (v_cat_other_bev, 'Ginger Ale — Canada Dry',  '', 150.00, 'bar', true),
    (v_cat_other_bev, 'Ginger Ale — Fever Tree',  '', 220.00, 'bar', true),
    (v_cat_other_bev, 'House Iced Tea',           '', 150.00, 'bar', true)
  ON CONFLICT (name) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    station_target = EXCLUDED.station_target,
    is_available = true,
    updated_at = now();

  -- 2a. Soda in Can size variants (Mini Php 80.00, Regular Php 120.00) & Coke/Sprite choice modifiers
  SELECT id INTO v_soda_id FROM public.products WHERE name = 'Soda in Can (Coke, Sprite)' LIMIT 1;
  IF v_soda_id IS NOT NULL THEN
    INSERT INTO public.product_variants (product_id, temperature, size_label, price, is_available, sort_order)
    VALUES
      (v_soda_id, 'NONE', 'Mini',     80.00, true, 1),
      (v_soda_id, 'NONE', 'Regular', 120.00, true, 2)
    ON CONFLICT (product_id, temperature, size_label) DO UPDATE SET
      price = EXCLUDED.price,
      is_available = true,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_soda_id AND name = 'Coke') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category)
      VALUES (v_soda_id, NULL, 'Coke', 0.00, 'all');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_soda_id AND name = 'Sprite') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category)
      VALUES (v_soda_id, NULL, 'Sprite', 0.00, 'all');
    END IF;
  END IF;

  -- 3. Seed HOUSE WINE (station_target = 'bar')
  INSERT INTO public.products (category_id, name, description, base_price, station_target, is_available)
  VALUES
    (v_cat_wine, 'House Wine — White', '', 350.00, 'bar', true),
    (v_cat_wine, 'House Wine — Red',   '', 350.00, 'bar', true)
  ON CONFLICT (name) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    base_price = EXCLUDED.base_price,
    station_target = EXCLUDED.station_target,
    is_available = true,
    updated_at = now();

  -- 4. Seed SINGLE SHOTS (station_target = 'bar')
  INSERT INTO public.products (category_id, name, description, base_price, station_target, is_available)
  VALUES
    (v_cat_shots, 'Gin (Sip Smith, Tanqueray)', '', 350.00, 'bar', true),
    (v_cat_shots, 'Rhum',                       '', 350.00, 'bar', true),
    (v_cat_shots, 'Tequila (1800)',             '', 350.00, 'bar', true),
    (v_cat_shots, 'Glenfiddich 12',             '', 350.00, 'bar', true),
    (v_cat_shots, 'Macallan 12',                '', 600.00, 'bar', true)
  ON CONFLICT (name) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    base_price = EXCLUDED.base_price,
    station_target = EXCLUDED.station_target,
    is_available = true,
    updated_at = now();

  SELECT id INTO v_gin_id FROM public.products WHERE name = 'Gin (Sip Smith, Tanqueray)' LIMIT 1;
  IF v_gin_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_gin_id AND name = 'Sip Smith') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category)
      VALUES (v_gin_id, NULL, 'Sip Smith', 0.00, 'all');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_gin_id AND name = 'Tanqueray') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category)
      VALUES (v_gin_id, NULL, 'Tanqueray', 0.00, 'all');
    END IF;
  END IF;

  -- 5. Seed BEER (station_target = 'bar')
  INSERT INTO public.products (category_id, name, description, base_price, station_target, is_available)
  VALUES
    (v_cat_beer, 'San Miguel Light', '', 180.00, 'bar', true),
    (v_cat_beer, 'Pale Pilsen',      '', 180.00, 'bar', true)
  ON CONFLICT (name) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    base_price = EXCLUDED.base_price,
    station_target = EXCLUDED.station_target,
    is_available = true,
    updated_at = now();

  -- 6. Align existing menu item descriptions & station targets with printed menu
  UPDATE public.products
  SET description = 'Homemade Italian pizza dough topped with Neapolitan tomato sauce, mozzarella and pepperoni, finished with extra-virgin olive oil.',
      base_price = 800.00,
      station_target = 'kitchen',
      updated_at = now()
  WHERE name = 'MONK’S I ❤ NYC';

  UPDATE public.products
  SET description = 'A white-sauce pizza topped with creamy béchamel, mozzarella and sautéed mushrooms, finished with fresh arugula and a drizzle of truffle oil.',
      base_price = 900.00,
      station_target = 'kitchen',
      updated_at = now()
  WHERE name = 'Pizza Blanca';

  UPDATE public.products
  SET description = 'Slow-braised ground beef meat sauce served with tagliatelle pasta',
      base_price = 550.00,
      station_target = 'kitchen',
      updated_at = now()
  WHERE name = 'Bolognese';

  UPDATE public.products
  SET description = 'A fresh mix of greens and arugula with creamy burrata, ripe tomatoes and roasted nuts, finished with extra-virgin olive oil, basil and honey.',
      base_price = 550.00,
      station_target = 'kitchen',
      updated_at = now()
  WHERE name = 'Monk''s Salad';

  UPDATE public.products
  SET description = 'Available with Breve upon request',
      updated_at = now()
  WHERE name = 'Matcha Latte'
    AND (description IS NULL OR btrim(description) = '');

  UPDATE public.products
  SET station_target = 'kitchen',
      updated_at = now()
  WHERE name = 'Rice' AND station_target <> 'kitchen';

  -- Remove stray legacy coffee modifiers from Sausage Platter
  DELETE FROM public.product_modifiers pm
  USING public.products p
  WHERE pm.product_id = p.id
    AND p.name = 'Sausage Platter'
    AND pm.name IN (
      'Barista Oat Milk',
      'Whole Dairy Milk',
      'Sub Soy / Almond Milk',
      'Extra House Espresso Shot',
      'Single Origin Ethiopia Shot',
      'Madagascar Vanilla Syrup',
      'Salted Caramel Syrup',
      'Roasted Hazelnut Syrup',
      'Cold Foam Topping'
    );
END $$;
