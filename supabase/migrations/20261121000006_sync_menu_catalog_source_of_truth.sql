-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Sync Cloud Menu Catalog to Source-of-Truth Menu
-- Migration: 20261121000006_sync_menu_catalog_source_of_truth.sql
-- ==============================================================================
-- Aligns categories, products, pricing, descriptions, variants, flavor options,
-- and modifiers strictly with the 6-page printed Monk's Dream menu:
--   1. Pastries (Banana Bread 150 + A La Mode +50)
--   2. Pizza (Monk's Classic 700, MONK'S I ❤ NYC 800, Pizza Blanca 800)
--   3. Pasta (Bolognese 550 w/ Linguine/Tagliatelle choice, Vongole 650)
--   4. Salad (Monk's Salad 550)
--   5. Pica Pica (Mixed Nuts 200, Sausage Platter 700)
--   6. Side Orders (Rice 50)
--   7. Coffee (13 Hot/Iced items + Latte 6 flavors)
--   8. Non-Coffee (4 Hot/Iced items)
--   9. Matcha (3 items) + 5 Standard Add-Ons across Coffee/Non-Coffee/Matcha
--  10. Other Beverages (7 items w/ Canned Soda Mini 80 / Regular 120)
--  11. House Wine (White 350, Red 350)
--  12. Single Shots (Gin Sipsmith/Tanqueray 350, Rum 350, Tequila 1800 350, Glenfiddich 12 350, Macallan 12 600)
--  13. Beer (San Miguel Light 180, Pale Pilsen 180)
--  14. Cocktail Collection (5 Timeless Classics 450, 5 A Little Rhythm In Every Pour 550)

DO $$
DECLARE
  v_cat_coffee     UUID;
  v_cat_non_coffee UUID;
  v_cat_matcha     UUID;
  v_cat_other_bev  UUID;
  v_cat_cocktails  UUID;
  v_cat_wine       UUID;
  v_cat_shots      UUID;
  v_cat_beer       UUID;
  v_cat_pastries   UUID;
  v_cat_pizza      UUID;
  v_cat_pasta      UUID;
  v_cat_salad      UUID;
  v_cat_pica       UUID;
  v_cat_sides      UUID;
  v_cat_door       UUID;

  v_banana_bread_id UUID := '0cbd94cd-0a5f-4a45-a734-c3f34070b04b';
  v_bolognese_id    UUID := 'e1111111-0000-0000-0000-000000000001';
  v_latte_id        UUID := '5f167b7d-59ab-47f3-b46b-ede5e25bd945';
  v_soda_id         UUID := '68def590-9b10-4432-933d-d1c7d86404bb';
  v_gin_id          UUID := '43d320db-9e2e-4ade-9d0d-caa60fdd2d1f';
  v_prod            RECORD;
  v_addon           RECORD;
BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. Upsert & Order Categories Cleanly
  -- ----------------------------------------------------------------------------
  INSERT INTO public.categories (name, slug, sort_order) VALUES
    ('Specialty Coffee',    'coffee',          1),
    ('Non-Coffee',          'non-coffee',      2),
    ('Matcha',              'matcha',          3),
    ('Other Beverages',     'other-beverages', 4),
    ('Cocktail Collection', 'cocktails',       5),
    ('House Wine',          'house-wine',      6),
    ('Single Shots',        'single-shots',    7),
    ('Beer',                'beer',            8),
    ('Pastries',            'pastries',        9),
    ('Pizza',               'pizza',           10),
    ('Pasta',               'pasta',           11),
    ('Salad',               'salad',           12),
    ('Pica Pica',           'pica-pica',       13),
    ('Side Orders',         'side-orders',     14),
    ('Door Charge',         'door_charge',     99)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  SELECT id INTO v_cat_coffee     FROM public.categories WHERE slug = 'coffee' LIMIT 1;
  SELECT id INTO v_cat_non_coffee FROM public.categories WHERE slug = 'non-coffee' LIMIT 1;
  SELECT id INTO v_cat_matcha     FROM public.categories WHERE slug = 'matcha' LIMIT 1;
  SELECT id INTO v_cat_other_bev  FROM public.categories WHERE slug = 'other-beverages' LIMIT 1;
  SELECT id INTO v_cat_cocktails  FROM public.categories WHERE slug = 'cocktails' LIMIT 1;
  SELECT id INTO v_cat_wine       FROM public.categories WHERE slug = 'house-wine' LIMIT 1;
  SELECT id INTO v_cat_shots      FROM public.categories WHERE slug = 'single-shots' LIMIT 1;
  SELECT id INTO v_cat_beer       FROM public.categories WHERE slug = 'beer' LIMIT 1;
  SELECT id INTO v_cat_pastries   FROM public.categories WHERE slug = 'pastries' LIMIT 1;
  SELECT id INTO v_cat_pizza      FROM public.categories WHERE slug = 'pizza' LIMIT 1;
  SELECT id INTO v_cat_pasta      FROM public.categories WHERE slug = 'pasta' LIMIT 1;
  SELECT id INTO v_cat_salad      FROM public.categories WHERE slug = 'salad' LIMIT 1;
  SELECT id INTO v_cat_pica       FROM public.categories WHERE slug = 'pica-pica' LIMIT 1;
  SELECT id INTO v_cat_sides      FROM public.categories WHERE slug = 'side-orders' LIMIT 1;
  SELECT id INTO v_cat_door       FROM public.categories WHERE slug = 'door_charge' LIMIT 1;

  -- ----------------------------------------------------------------------------
  -- 2. Remove Discontinued Items Not on the 6-Page Source-of-Truth Menu
  -- ----------------------------------------------------------------------------
  -- Reassign legacy test order_items from Monk's Italian Regular -> Monk's Classic
  UPDATE public.order_items
  SET product_id = 'c3b2f6f3-853d-4066-ba15-924594bee7cd'
  WHERE product_id = '61bb8a84-4b27-489e-bacc-3b4220a5632e';

  DELETE FROM public.product_modifiers
  WHERE product_id IN (
    '61bb8a84-4b27-489e-bacc-3b4220a5632e', -- Monk's Italian Regular
    'c7764212-f479-42ca-bbe9-30154e26eeac', -- Banana Bread Topped with Vanilla Ice Cream
    '08d4a251-eb5a-49f7-8fb7-130ab9888adb'  -- Asian Beef Strips
  );

  DELETE FROM public.products
  WHERE id IN (
    '61bb8a84-4b27-489e-bacc-3b4220a5632e',
    'c7764212-f479-42ca-bbe9-30154e26eeac',
    '08d4a251-eb5a-49f7-8fb7-130ab9888adb'
  );

  -- ----------------------------------------------------------------------------
  -- 3. PAGE 1: PASTRIES, PIZZA, PASTA, SALAD (station_target = 'kitchen')
  -- ----------------------------------------------------------------------------
  -- Pastries: Banana Bread Php 150.00 (+50 a la mode modifier)
  UPDATE public.products
  SET category_id = v_cat_pastries,
      name = 'Banana Bread',
      description = 'Made fresh daily. Add Php 50.00 for a la mode.',
      base_price = 150.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = v_banana_bread_id;

  DELETE FROM public.product_modifiers
  WHERE product_id = v_banana_bread_id AND name <> 'A La Mode';

  IF EXISTS (SELECT 1 FROM public.products WHERE id = v_banana_bread_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_banana_bread_id AND name = 'A La Mode') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category, amount_delta)
      VALUES (v_banana_bread_id, NULL, 'A La Mode', 50.00, 'all', 0);
    ELSE
      UPDATE public.product_modifiers
      SET price_delta = 50.00, applicable_category = 'all'
      WHERE product_id = v_banana_bread_id AND name = 'A La Mode';
    END IF;
  END IF;

  -- Pizza: Monk's Classic (700), MONK'S I ❤ NYC (800), Pizza Blanca (800)
  UPDATE public.products
  SET category_id = v_cat_pizza,
      name = 'Monk''s Classic',
      description = 'Traditional Italian pizza dough, mozzarella, and basil',
      base_price = 700.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = 'c3b2f6f3-853d-4066-ba15-924594bee7cd';

  UPDATE public.products
  SET category_id = v_cat_pizza,
      name = 'MONK''S I ❤ NYC',
      description = 'Traditional Italian pizza dough, pepperoni, and mozzarella',
      base_price = 800.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = 'e3333333-0000-0000-0000-000000000002';

  UPDATE public.products
  SET category_id = v_cat_pizza,
      name = 'Pizza Blanca',
      description = 'Traditional Italian pizza dough, white sauce, mushroom, and arugula',
      base_price = 800.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = 'e3333333-0000-0000-0000-000000000003';

  -- Clear legacy demo toppings on Pizza & Pasta
  DELETE FROM public.product_modifiers
  WHERE product_id IN (
    'c3b2f6f3-853d-4066-ba15-924594bee7cd',
    'e3333333-0000-0000-0000-000000000002',
    'e3333333-0000-0000-0000-000000000003',
    'e1111111-0000-0000-0000-000000000001',
    'e1111111-0000-0000-0000-000000000003'
  )
  AND name NOT IN ('Linguine', 'Tagliatelle');

  -- Pasta: Bolognese (550 + choice of Linguine / Tagliatelle), Vongole (650)
  UPDATE public.products
  SET category_id = v_cat_pasta,
      name = 'Bolognese',
      description = 'Traditional meat sauce, choice of linguine or tagliatelle',
      base_price = 550.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = v_bolognese_id;

  IF EXISTS (SELECT 1 FROM public.products WHERE id = v_bolognese_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_bolognese_id AND name = 'Linguine') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category, amount_delta)
      VALUES (v_bolognese_id, NULL, 'Linguine', 0.00, 'all', 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.product_modifiers WHERE product_id = v_bolognese_id AND name = 'Tagliatelle') THEN
      INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category, amount_delta)
      VALUES (v_bolognese_id, NULL, 'Tagliatelle', 0.00, 'all', 0);
    END IF;
  END IF;

  UPDATE public.products
  SET category_id = v_cat_pasta,
      name = 'Vongole',
      description = 'Manila clams, white wine sauce, and linguine',
      base_price = 650.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = 'e1111111-0000-0000-0000-000000000003';

  -- Salad: Monk's Salad (550)
  UPDATE public.products
  SET category_id = v_cat_salad,
      name = 'Monk''s Salad',
      description = 'Mixed greens, mozzarella, cherry tomatoes, and Monk''s signature balsamic dressing',
      base_price = 550.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = '6dcfcf7e-51f9-487e-bdd4-67dff29406b0';

  -- ----------------------------------------------------------------------------
  -- 4. PAGE 2: PICA PICA & SIDE ORDERS (station_target = 'kitchen')
  -- ----------------------------------------------------------------------------
  UPDATE public.products
  SET category_id = v_cat_pica,
      name = 'Mixed Nuts',
      description = '',
      base_price = 200.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = '28350bad-db20-4755-b69f-4252c2ebe959';

  UPDATE public.products
  SET category_id = v_cat_pica,
      name = 'Sausage Platter',
      description = 'Wienerli, Hungarian and Veal sausages, roasted potatoes and homemade sauerkraut.',
      base_price = 700.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = '43353bba-c0a1-42ef-9f68-c8909b02a847';

  UPDATE public.products
  SET category_id = v_cat_sides,
      name = 'Rice',
      description = '',
      base_price = 50.00,
      station_target = 'kitchen',
      is_available = true,
      updated_at = now()
  WHERE id = 'bc5f6705-93c7-411c-9bf7-1b0ecf4a5a58';

  -- ----------------------------------------------------------------------------
  -- 5. PAGE 3: COFFEE & NON-COFFEE (station_target = 'bar')
  -- ----------------------------------------------------------------------------
  -- Hot-only Coffee items: ensure HOT/Standard variant exists
  INSERT INTO public.product_variants (product_id, temperature, size_label, price, is_available, sort_order)
  SELECT v.product_id::UUID, v.temperature, v.size_label, v.price, v.is_available, v.sort_order
  FROM (
    VALUES
      ('aec9eba9-d345-4387-aede-e2c4470cbc0c', 'HOT', 'Standard', 125.00, true, 1), -- Ristretto
      ('da4ff972-8edf-4342-aedc-e521e7e42cae', 'HOT', 'Standard', 125.00, true, 1), -- Espresso
      ('37768d94-f02c-43c2-86e3-b6013cc3b27b', 'HOT', 'Standard', 125.00, true, 1), -- Lungo
      ('4396b35c-cbdb-4e2f-8a44-94d07c52339e', 'HOT', 'Standard', 170.00, true, 1), -- Macchiato
      ('6623c544-fe7f-434a-9705-cb51963e01f0', 'HOT', 'Standard', 180.00, true, 1), -- Cortado
      ('0a991d81-fc91-45ea-bf26-005393d6ec13', 'HOT', 'Standard', 180.00, true, 1)  -- Cappuccino
  ) AS v(product_id, temperature, size_label, price, is_available, sort_order)
  WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id = v.product_id::UUID)
  ON CONFLICT (product_id, temperature, size_label) DO UPDATE SET
    price = EXCLUDED.price,
    is_available = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  -- Iced-only Coffee items: ensure COLD/Standard variant exists
  INSERT INTO public.product_variants (product_id, temperature, size_label, price, is_available, sort_order)
  SELECT v.product_id::UUID, v.temperature, v.size_label, v.price, v.is_available, v.sort_order
  FROM (
    VALUES
      ('87f97570-5d4a-4ada-969c-9cc05f528ce1', 'COLD', 'Standard', 150.00, true, 1), -- Espresso Foam
      ('0f36dad5-8555-4f79-abcf-d15d8893ed1d', 'COLD', 'Standard', 200.00, true, 1), -- Affogato
      ('64ce5418-92e0-4f72-8735-21080310ac5b', 'COLD', 'Standard', 250.00, true, 1), -- Caramel Latte with Strawberry Cold Foam
      ('9487921e-5027-4ff1-a6cf-d973518b06c1', 'COLD', 'Standard', 250.00, true, 1)  -- Mocha with Dark Chocolate Cold Foam
  ) AS v(product_id, temperature, size_label, price, is_available, sort_order)
  WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id = v.product_id::UUID)
  ON CONFLICT (product_id, temperature, size_label) DO UPDATE SET
    price = EXCLUDED.price,
    is_available = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  -- Hot + Iced Coffee items
  INSERT INTO public.product_variants (product_id, temperature, size_label, price, is_available, sort_order)
  SELECT v.product_id::UUID, v.temperature, v.size_label, v.price, v.is_available, v.sort_order
  FROM (
    VALUES
      ('3f620998-6ef2-4a0e-a48c-6e6acab407fa', 'HOT',  'Standard', 150.00, true, 1), -- Americano / Aerocano Hot
      ('3f620998-6ef2-4a0e-a48c-6e6acab407fa', 'COLD', 'Standard', 170.00, true, 2), -- Americano / Aerocano Iced
      ('15452f3b-3368-4763-9155-3ad79cf67937', 'HOT',  'Standard', 180.00, true, 1), -- White Mocha Hot
      ('15452f3b-3368-4763-9155-3ad79cf67937', 'COLD', 'Standard', 200.00, true, 2), -- White Mocha Iced
      ('5f167b7d-59ab-47f3-b46b-ede5e25bd945', 'HOT',  'Standard', 180.00, true, 1), -- Latte Hot
      ('5f167b7d-59ab-47f3-b46b-ede5e25bd945', 'COLD', 'Standard', 195.00, true, 2)  -- Latte Iced
  ) AS v(product_id, temperature, size_label, price, is_available, sort_order)
  WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id = v.product_id::UUID)
  ON CONFLICT (product_id, temperature, size_label) DO UPDATE SET
    price = EXCLUDED.price,
    is_available = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  -- Latte description & exact Flavor ordering: Plain, Spanish, Caramel, Salted Caramel, Strawberry, Vanilla
  UPDATE public.products
  SET description = 'Plain · Spanish · Caramel · Salted Caramel · Strawberry · Vanilla',
      updated_at = now()
  WHERE id = v_latte_id;

  UPDATE public.product_variant_options SET sort_order = 1 WHERE id = '30000000-0000-0000-0000-000000000041'; -- Plain
  UPDATE public.product_variant_options SET sort_order = 2 WHERE id = '30000000-0000-0000-0000-000000000042'; -- Spanish
  UPDATE public.product_variant_options SET sort_order = 3 WHERE id = '30000000-0000-0000-0000-000000000043'; -- Caramel
  UPDATE public.product_variant_options SET sort_order = 4 WHERE code = 'salted_caramel';
  UPDATE public.product_variant_options SET sort_order = 5 WHERE code = 'strawberry';
  UPDATE public.product_variant_options SET sort_order = 6 WHERE id = '30000000-0000-0000-0000-000000000044'; -- Vanilla

  UPDATE public.product_variant_option_assignments oa
  SET sort_order = o.sort_order,
      price_delta = 0.00,
      is_available = true,
      updated_at = now()
  FROM public.product_variant_options o
  WHERE oa.option_id = o.id
    AND oa.product_id = v_latte_id;

  -- Non-Coffee: normalize apostrophe and 'Regular' -> 'Standard', ensure Pumpkin Spice is HOT
  UPDATE public.products
  SET name = 'Monk''s Signature Chocolate with Sea Salt Foam',
      base_price = 200.00,
      updated_at = now()
  WHERE id = '2a3dcd4d-e2fb-4345-9d7e-0db2999da28d';

  UPDATE public.product_variants
  SET size_label = 'Standard',
      updated_at = now()
  WHERE product_id IN (
    '2a3dcd4d-e2fb-4345-9d7e-0db2999da28d', -- Monk's Signature Chocolate with Sea Salt Foam
    'a76dc028-0457-41e1-a115-e44b123efa2f', -- Biscoff Milk
    '73630064-a9f8-491a-8fe3-f9defdcd1230'  -- Strawberry Milk
  )
  AND size_label = 'Regular';

  INSERT INTO public.product_variants (product_id, temperature, size_label, price, is_available, sort_order)
  SELECT '268e9019-2271-4e2f-af0c-a82bc8cd8540'::UUID, 'HOT', 'Standard', 180.00, true, 1 -- Pumpkin Spice
  WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id = '268e9019-2271-4e2f-af0c-a82bc8cd8540'::UUID)
  ON CONFLICT (product_id, temperature, size_label) DO UPDATE SET
    price = EXCLUDED.price,
    is_available = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  -- ----------------------------------------------------------------------------
  -- 6. PAGE 4: MATCHA & ADD-ONS (station_target = 'bar')
  -- ----------------------------------------------------------------------------
  UPDATE public.products
  SET category_id = v_cat_matcha,
      name = 'Matcha Latte',
      description = 'Available with breve upon request',
      base_price = 220.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = '88996397-73f1-45f1-9c66-c8c91cb029fe';

  UPDATE public.products
  SET category_id = v_cat_matcha,
      name = 'Strawberry in Coconut Water with Matcha Cold Foam',
      description = '',
      base_price = 290.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = 'c6481a1b-7672-48b9-99f5-1c3831d1f91a';

  UPDATE public.products
  SET category_id = v_cat_matcha,
      name = 'Matcha in Coconut Water',
      description = 'Sugar syrup (optional) · coconut water · ice · matcha',
      base_price = 270.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = 'a923c344-0a42-4e67-8542-ce0aac7cab4c';

  -- Ensure all Coffee, Non-Coffee, and Matcha products carry the exact 5 Add-Ons
  FOR v_prod IN
    SELECT p.id
    FROM public.products p
    WHERE p.category_id IN (v_cat_coffee, v_cat_non_coffee, v_cat_matcha)
  LOOP
    DELETE FROM public.product_modifiers
    WHERE product_id = v_prod.id
      AND name NOT IN ('Espresso Shot', 'Syrup', 'Breve', 'Oat Milk', 'Almond Milk');

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
        SET price_delta = v_addon.addon_price, applicable_category = 'all'
        WHERE product_id = v_prod.id AND name = v_addon.addon_name;
      ELSE
        INSERT INTO public.product_modifiers (product_id, group_id, name, price_delta, applicable_category, amount_delta)
        VALUES (v_prod.id, NULL, v_addon.addon_name, v_addon.addon_price, 'all', 0);
      END IF;
    END LOOP;
  END LOOP;

  -- ----------------------------------------------------------------------------
  -- 7. PAGE 5: OTHER BEVERAGES, HOUSE WINE, SINGLE SHOTS, BEER
  -- ----------------------------------------------------------------------------
  UPDATE public.products
  SET name = 'Canned Soda (Coke, Sprite)',
      description = 'Mini (Php 80.00) · Regular (Php 120.00)',
      base_price = 80.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = v_soda_id;

  UPDATE public.products
  SET name = 'Ginger Ale — Fever-Tree',
      base_price = 220.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = 'f8993840-21cf-40bd-8e6b-7ad25d499992';

  UPDATE public.products
  SET name = 'Gin (Sipsmith, Tanqueray)',
      base_price = 350.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = v_gin_id;

  UPDATE public.product_modifiers
  SET name = 'Sipsmith'
  WHERE product_id = v_gin_id AND name = 'Sip Smith';

  UPDATE public.products
  SET name = 'Rum',
      base_price = 350.00,
      station_target = 'bar',
      is_available = true,
      updated_at = now()
  WHERE id = 'd3a78ac7-e69e-4563-9cd2-acd6c01b0373';

  -- ----------------------------------------------------------------------------
  -- 8. PAGE 6: COCKTAIL COLLECTION (station_target = 'bar')
  -- ----------------------------------------------------------------------------
  INSERT INTO public.products (category_id, name, description, base_price, station_target, is_available)
  VALUES
    -- TIMELESS CLASSICS (Php 450.00)
    (v_cat_cocktails, 'Old Fashioned',    'Maker''s Mark, sugar, and bitters',                             450.00, 'bar', true),
    (v_cat_cocktails, 'Margarita',        '1800 Tequila, lime juice, and salt',                            450.00, 'bar', true),
    (v_cat_cocktails, 'Espresso Martini', 'Absolut Vodka and Pocket Rockets espresso',                     450.00, 'bar', true),
    (v_cat_cocktails, 'Classic Negroni',  'Sipsmith, Campari, and Cocchi vermouth',                        450.00, 'bar', true),
    (v_cat_cocktails, 'Whiskey Sour',     'Black Label, lemon juice, sugar and bitters',                   450.00, 'bar', true),
    -- A LITTLE RHYTHM IN EVERY POUR (Php 550.00)
    (v_cat_cocktails, 'Crimson Coda (Monk''s version of Amaretto Sour)', 'Disaronno, Jim Beam, lemon juice, and Sangiovese', 550.00, 'bar', true),
    (v_cat_cocktails, 'Blue Note Blush',  'Sipsmith, aloe vera, lychee, and lemon juice',                  550.00, 'bar', true),
    (v_cat_cocktails, 'Monk''s Crescendo', 'Hibiscus-infused 1800 Tequila, grapefruit juice, and rose syrup', 550.00, 'bar', true),
    (v_cat_cocktails, 'Off-Beat Dream',   'Bacardi, pineapple juice, lime juice, coconut rum, and pandan syrup', 550.00, 'bar', true),
    (v_cat_cocktails, 'Pandan Mango Daiquiri', '',                                                         550.00, 'bar', true)
  ON CONFLICT (name) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    station_target = EXCLUDED.station_target,
    is_available = true,
    updated_at = now();
END $$;
