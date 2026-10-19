-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Comprehensive Database Seed Script
-- File: supabase/seed.sql
-- ==============================================================================

-- 1. STAFF USERS ROSTER (Standardized 4-digit PINs)
INSERT INTO public.users (id, username, display_name, role, pin, is_workflow_staff, base_daily_rate, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'miles_manager', 'Miles (Manager)', 'admin', '9999', true, 100.00, true),
  ('22222222-2222-2222-2222-222222222222', 'coltrane_cashier', 'Coltrane (Cashier)', 'cashier', '1111', true, 60.00, true),
  ('33333333-3333-3333-3333-333333333333', 'ella_waiter', 'Ella (Floor Waiter)', 'waiter', '2222', true, 55.00, true),
  ('44444444-4444-4444-4444-444444444444', 'monk_bar', 'Thelonious (Bartender)', 'station_bar', '3333', true, 65.00, true),
  ('55555555-5555-5555-5555-555555555555', 'bill_cafe', 'Bill (Barista)', 'station_cafe', '4444', true, 55.00, true),
  ('66666666-6666-6666-6666-666666666666', 'chet_kitchen', 'Chet (Head Chef)', 'station_food', '5555', true, 75.00, true),
  ('77777777-7777-7777-7777-777777777777', 'max_runner', 'Max (FOH Runner)', 'foh_runner', '6666', true, 50.00, true),
  ('88888888-8888-8888-8888-888888888888', 'rosa_dish', 'Rosa (Dishwasher)', 'waiter', '7777', false, 45.00, true),
  ('99999999-9999-9999-9999-999999999999', 'marcus_sound', 'Marcus (Sound Tech)', 'admin', '8888', false, 70.00, true)
ON CONFLICT (username) DO NOTHING;

-- 2. PHYSICAL TABLES (15 Cafe Area + 10 Bar Area = 25 Tables)
INSERT INTO public.tables (id, table_number, zone, capacity, is_occupied)
VALUES
  -- Cafe Area (Cafe 1 - 15)
  (gen_random_uuid(), 'Cafe 1', 'CAFE_AREA', 2, false),
  (gen_random_uuid(), 'Cafe 2', 'CAFE_AREA', 2, false),
  (gen_random_uuid(), 'Cafe 3', 'CAFE_AREA', 4, false),
  (gen_random_uuid(), 'Cafe 4', 'CAFE_AREA', 4, false),
  (gen_random_uuid(), 'Cafe 5', 'CAFE_AREA', 4, false),
  (gen_random_uuid(), 'Cafe 6', 'CAFE_AREA', 6, false),
  (gen_random_uuid(), 'Cafe 7', 'CAFE_AREA', 6, false),
  (gen_random_uuid(), 'Cafe 8', 'CAFE_AREA', 2, false),
  (gen_random_uuid(), 'Cafe 9', 'CAFE_AREA', 2, false),
  (gen_random_uuid(), 'Cafe 10', 'CAFE_AREA', 4, false),
  (gen_random_uuid(), 'Cafe 11', 'CAFE_AREA', 4, false),
  (gen_random_uuid(), 'Cafe 12', 'CAFE_AREA', 4, false),
  (gen_random_uuid(), 'Cafe 13', 'CAFE_AREA', 6, false),
  (gen_random_uuid(), 'Cafe 14', 'CAFE_AREA', 2, false),
  (gen_random_uuid(), 'Cafe 15', 'CAFE_AREA', 4, false),
  -- Bar Area (Bar 1 - 10)
  (gen_random_uuid(), 'Bar 1', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 2', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 3', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 4', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 5', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 6', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 7', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 8', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 9', 'BAR_AREA', 1, false),
  (gen_random_uuid(), 'Bar 10', 'BAR_AREA', 1, false)
ON CONFLICT (table_number) DO NOTHING;

-- 3. MENU CATEGORIES
INSERT INTO public.categories (id, name, slug, sort_order)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Specialty Coffee', 'coffee', 1),
  ('c2222222-2222-2222-2222-222222222222', 'Signature Cocktails & Wine', 'cocktails_wine', 2),
  ('c3333333-3333-3333-3333-333333333333', 'Kitchen Mains & Pasta', 'mains_pasta', 3),
  ('c4444444-4444-4444-4444-444444444444', 'Small Plates & Bar Bites', 'small_plates', 4),
  ('c5555555-5555-5555-5555-555555555555', 'Pastries & Desserts', 'desserts', 5)
ON CONFLICT (slug) DO NOTHING;

-- 4. RAW INVENTORY ITEMS (Initial Stock & Par Levels)
INSERT INTO public.inventory_items (id, sku, name, category, current_stock, unit, min_alert_level, unit_cost, supplier_name)
VALUES
  ('b1000001-0000-0000-0000-000000000001', 'COF-001', 'Specialty Espresso Bean', 'COFFEE_TEA', 25.000, 'kg', 5.000, 22.00, 'Artisan Roasters'),
  ('b1000002-0000-0000-0000-000000000002', 'COF-002', 'Single Origin Ethiopia Bean', 'COFFEE_TEA', 12.000, 'kg', 3.000, 28.00, 'Artisan Roasters'),
  ('b1000003-0000-0000-0000-000000000003', 'DRY-010', 'Barista Oat Milk', 'DAIRY_PLANT', 48.000, 'L', 12.000, 2.80, 'Oatly Wholesalers'),
  ('b1000004-0000-0000-0000-000000000004', 'DRY-012', 'Whole Dairy Milk', 'DAIRY_PLANT', 36.000, 'L', 10.000, 1.90, 'Local Dairy Farm'),
  ('b1000005-0000-0000-0000-000000000005', 'BAR-101', 'London Dry Gin 750ml', 'SPIRITS_LIQUOR', 15.000, 'pcs', 3.000, 24.00, 'Metropolitan Beverage'),
  ('b1000006-0000-0000-0000-000000000006', 'BAR-105', 'Campari Bitter 750ml', 'SPIRITS_LIQUOR', 10.000, 'pcs', 2.000, 26.00, 'Metropolitan Beverage'),
  ('b1000007-0000-0000-0000-000000000007', 'BAR-108', 'Sweet Red Vermouth 750ml', 'SPIRITS_LIQUOR', 10.000, 'pcs', 2.000, 19.00, 'Metropolitan Beverage'),
  ('b1000008-0000-0000-0000-000000000008', 'BAR-110', 'Rye Whiskey 750ml', 'SPIRITS_LIQUOR', 12.000, 'pcs', 3.000, 32.00, 'Metropolitan Beverage'),
  ('b1000009-0000-0000-0000-000000000009', 'BAR-112', 'Premium Vodka 750ml', 'SPIRITS_LIQUOR', 15.000, 'pcs', 4.000, 22.00, 'Metropolitan Beverage'),
  ('b1000010-0000-0000-0000-000000000010', 'BAR-115', 'Kahlua Coffee Liqueur 750ml', 'SPIRITS_LIQUOR', 8.000, 'pcs', 2.000, 25.00, 'Metropolitan Beverage'),
  ('b1000011-0000-0000-0000-000000000011', 'BAR-118', 'Absinthe Verte 750ml', 'SPIRITS_LIQUOR', 5.000, 'pcs', 1.000, 45.00, 'Metropolitan Beverage'),
  ('b1000012-0000-0000-0000-000000000012', 'BAR-120', 'Peychauds Bitters', 'SYRUPS_MIXERS', 6.000, 'pcs', 1.000, 14.00, 'Cocktail Supply Co'),
  ('b1000013-0000-0000-0000-000000000013', 'KIT-201', 'Cured Guanciale', 'KITCHEN_MEAT', 10.000, 'kg', 2.000, 28.00, 'Italian Imports Co'),
  ('b1000014-0000-0000-0000-000000000014', 'KIT-205', 'Artisan Spaghetti', 'DRY_GOODS', 30.000, 'kg', 5.000, 4.50, 'Italian Imports Co'),
  ('b1000015-0000-0000-0000-000000000015', 'KIT-210', 'Farm Fresh Eggs', 'PRODUCE', 180.000, 'pcs', 30.000, 0.35, 'Local Farm Organics'),
  ('b1000016-0000-0000-0000-000000000016', 'KIT-220', 'Parmigiano Reggiano DOP', 'DAIRY_PLANT', 8.000, 'kg', 1.500, 32.00, 'Italian Imports Co'),
  ('b1000017-0000-0000-0000-000000000017', 'KIT-225', 'Truffle Oil Infusion', 'SYRUPS_MIXERS', 2.000, 'L', 0.500, 60.00, 'Gourmet Pantry'),
  ('b1000018-0000-0000-0000-000000000018', 'KIT-230', 'Artisan Pizza Dough Balls', 'DRY_GOODS', 40.000, 'pcs', 10.000, 1.80, 'Artisan Bakery'),
  ('b1000019-0000-0000-0000-000000000019', 'KIT-232', 'San Marzano Tomato Sauce', 'PRODUCE', 20.000, 'kg', 4.000, 6.00, 'Italian Imports Co'),
  ('b1000020-0000-0000-0000-000000000020', 'KIT-235', 'Fresh Mozzarella Di Bufala', 'DAIRY_PLANT', 15.000, 'kg', 3.000, 18.00, 'Italian Imports Co'),
  ('b1000021-0000-0000-0000-000000000021', 'KIT-240', 'Artisan Ciabatta Buns', 'DRY_GOODS', 35.000, 'pcs', 10.000, 1.20, 'Artisan Bakery'),
  ('b1000022-0000-0000-0000-000000000022', 'KIT-242', 'Provolone Cheese', 'DAIRY_PLANT', 6.000, 'kg', 1.000, 21.00, 'Italian Imports Co'),
  ('b1000023-0000-0000-0000-000000000023', 'KIT-245', 'Fresh Arugula', 'PRODUCE', 4.000, 'kg', 1.000, 12.00, 'Local Farm Organics'),
  ('b1000024-0000-0000-0000-000000000024', 'OUT-301', 'Artisan Butter Croissant', 'DRY_GOODS', 25.000, 'pcs', 5.000, 3.00, 'Patisserie Partner'),
  ('b1000025-0000-0000-0000-000000000025', 'OUT-305', 'Basque Burnt Cheesecake Slice', 'DRY_GOODS', 18.000, 'pcs', 4.000, 5.00, 'Patisserie Partner')
ON CONFLICT (sku) DO NOTHING;

-- 5. PRODUCTS (Menu Items with High-Definition Cover Images)
INSERT INTO public.products (id, category_id, name, image_url, description, base_price, station_target, is_resold_outside_food, original_cost, auto_86, allergens, dietary, is_available)
VALUES
  -- Specialty Coffee
  ('e1111111-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 'Flat White', 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80', 'Velvety microfoam over double ristretto espresso', 180.00, 'bar', false, NULL, false, ARRAY['DAIRY'], ARRAY['Vegetarian'], true),
  ('e1111111-0000-0000-0000-000000000002', 'c1111111-1111-1111-1111-111111111111', 'V60 Pour Over', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 'Single origin floral notes, brewed by hand', 220.00, 'bar', false, NULL, false, ARRAY[]::text[], ARRAY['Vegan', 'Vegetarian'], true),
  ('e1111111-0000-0000-0000-000000000003', 'c1111111-1111-1111-1111-111111111111', 'Cold Brew', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80', 'Steeped 18 hours in cold filtered water, smooth chocolate body', 200.00, 'bar', false, NULL, false, ARRAY[]::text[], ARRAY['Vegan', 'Vegetarian'], true),

  -- Cocktails & Wine
  ('e2222222-0000-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222', 'Thelonious Monk Negroni', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', 'London Dry Gin, Campari, Sweet Vermouth, flame orange peel', 420.00, 'bar', false, NULL, false, ARRAY[]::text[], ARRAY['Vegan'], true),
  ('e2222222-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222222', 'Blue Note Espresso Martini', 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?auto=format&fit=crop&w=600&q=80', 'Vodka, Kahlua, fresh pulled double espresso, shaken hard', 450.00, 'bar', false, NULL, false, ARRAY[]::text[], ARRAY['Vegetarian'], true),
  ('e2222222-0000-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222', 'Miles Davis Sazerac', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80', 'Rye Whiskey, Absinthe rinse, Peychauds bitters, lemon twist', 450.00, 'bar', false, NULL, false, ARRAY[]::text[], ARRAY['Vegan'], true),

  -- Kitchen Mains & Pasta
  ('e3333333-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'Truffle Carbonara', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80', 'Artisan spaghetti, crisp guanciale, farm egg yolks, DOP pecorino, black truffle infusion', 520.00, 'kitchen', false, NULL, false, ARRAY['DAIRY', 'GLUTEN', 'EGGS'], ARRAY[]::text[], true),
  ('e3333333-0000-0000-0000-000000000002', 'c3333333-3333-3333-3333-333333333333', 'Margherita Pizza', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80', 'San Marzano sauce, fresh mozzarella di bufala, basil', 550.00, 'kitchen', false, NULL, false, ARRAY['DAIRY', 'GLUTEN'], ARRAY['Vegetarian'], true),
  ('e3333333-0000-0000-0000-000000000003', 'c3333333-3333-3333-3333-333333333333', 'Guanciale Panini', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80', 'Warm ciabatta, cured guanciale, melted provolone, baby arugula', 420.00, 'kitchen', false, NULL, false, ARRAY['DAIRY', 'GLUTEN'], ARRAY[]::text[], true),

  -- Resold Outside Food (Fixed +20% Markup Constraint)
  ('e5555555-0000-0000-0000-000000000001', 'c5555555-5555-5555-5555-555555555555', 'Artisan Butter Croissant', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80', 'Flaky French butter croissant from partnering patisserie (+20% margin)', 180.00, 'bar', true, 150.00, false, ARRAY['DAIRY', 'GLUTEN'], ARRAY['Vegetarian'], true),
  ('e5555555-0000-0000-0000-000000000002', 'c5555555-5555-5555-5555-555555555555', 'Basque Burnt Cheesecake Slice', 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80', 'Caramelized crust, creamy custard center (+20% margin)', 280.00, 'bar', true, 233.33, false, ARRAY['DAIRY', 'EGGS'], ARRAY['Vegetarian'], true)
ON CONFLICT (name) DO NOTHING;

-- 6. RECIPE BILL OF MATERIALS (BOM)
INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
VALUES
  -- Flat White: 0.018 kg beans + 0.200 L oat milk
  ('e1111111-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 0.018, 'kg', 1.0),
  ('e1111111-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000003', 0.200, 'L', 1.0),

  -- V60: 0.015 kg Ethiopia beans
  ('e1111111-0000-0000-0000-000000000002', 'b1000002-0000-0000-0000-000000000002', 0.015, 'kg', 1.0),

  -- Cold Brew: 0.020 kg beans
  ('e1111111-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000001', 0.020, 'kg', 1.0),

  -- Monk Negroni: 1/25 bottle Gin (30ml) + 1/25 Campari (30ml) + 1/25 Sweet Vermouth (30ml)
  ('e2222222-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000005', 0.040, 'pcs', 1.0),
  ('e2222222-0000-0000-0000-000000000001', 'b1000006-0000-0000-0000-000000000006', 0.040, 'pcs', 1.0),
  ('e2222222-0000-0000-0000-000000000001', 'b1000007-0000-0000-0000-000000000007', 0.040, 'pcs', 1.0),

  -- Truffle Carbonara: 0.100 kg spaghetti + 0.060 kg guanciale + 2 eggs + 0.030 kg parmesan + 0.005 L truffle oil
  ('e3333333-0000-0000-0000-000000000001', 'b1000014-0000-0000-0000-000000000014', 0.100, 'kg', 1.0),
  ('e3333333-0000-0000-0000-000000000001', 'b1000013-0000-0000-0000-000000000013', 0.060, 'kg', 1.0),
  ('e3333333-0000-0000-0000-000000000001', 'b1000015-0000-0000-0000-000000000015', 2.000, 'pcs', 1.0),
  ('e3333333-0000-0000-0000-000000000001', 'b1000016-0000-0000-0000-000000000016', 0.030, 'kg', 1.0),
  ('e3333333-0000-0000-0000-000000000001', 'b1000017-0000-0000-0000-000000000017', 0.005, 'L', 1.0),

  -- Resold Outside Food direct inventory binding
  ('e5555555-0000-0000-0000-000000000001', 'b1000024-0000-0000-0000-000000000024', 1.000, 'pcs', 1.0),
  ('e5555555-0000-0000-0000-000000000002', 'b1000025-0000-0000-0000-000000000025', 1.000, 'pcs', 1.0)
ON CONFLICT (product_id, inventory_item_id) DO NOTHING;
