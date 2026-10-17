-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Initial Supabase PostgreSQL Schema Migration
-- Migration: 20261017000000_init_pos_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. OPERATIONAL ENUMS
CREATE TYPE public.role AS ENUM (
  'admin',
  'cashier',
  'waiter',
  'station_bar',
  'station_cafe',
  'station_food',
  'foh_runner',
  'printer_station'
);

CREATE TYPE public.operating_mode AS ENUM ('CAFE', 'EVENT');
CREATE TYPE public.table_zone AS ENUM ('CAFE_AREA', 'BAR_AREA');
CREATE TYPE public.tab_status AS ENUM ('OPEN', 'BILLED', 'CLOSED', 'CANCELLED');
CREATE TYPE public.order_status AS ENUM ('OPEN', 'IN_PREPARATION', 'READY_TO_SERVE', 'SERVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.item_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE public.station_target AS ENUM ('bar', 'kitchen');
CREATE TYPE public.order_type AS ENUM ('DINE_IN', 'TAKEOUT', 'ONLINE_DELIVERY');
CREATE TYPE public.order_channel AS ENUM ('CAFE_AREA', 'BAR_AREA', 'TAKEOUT_COUNTER', 'GRAB_FOOD', 'FOODPANDA', 'OTHER_ONLINE');
CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'DIGITAL_WALLET', 'GRAB_PAY_IN_APP', 'FOODPANDA_IN_APP', 'COMP');
CREATE TYPE public.allergen AS ENUM ('DAIRY', 'GLUTEN', 'PEANUTS', 'TREE_NUTS', 'SHELLFISH', 'EGGS', 'SOY', 'FISH', 'SESAME');
CREATE TYPE public.inventory_category AS ENUM ('COFFEE_TEA', 'DAIRY_PLANT', 'SPIRITS_LIQUOR', 'WINE_BEER', 'SYRUPS_MIXERS', 'KITCHEN_MEAT', 'PRODUCE', 'DRY_GOODS', 'PACKAGING');
CREATE TYPE public.stock_movement_type AS ENUM ('SALE_DEPLETION', 'RESTOCK_DELIVERY', 'SPOILAGE_WASTE', 'STOCKTAKE_ADJUST', 'CANCEL_RESTORE');
CREATE TYPE public.waste_reason AS ENUM ('DROPPED_SPILL', 'EXPIRED', 'PREPARATION_ERROR', 'CUSTOMER_RETURN', 'STAFF_TASTING');
CREATE TYPE public.print_job_status AS ENUM ('PENDING', 'PRINTING', 'COMPLETED', 'FAILED');

-- 3. CORE RELATIONAL MODELS

-- Staff Users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role public.role NOT NULL DEFAULT 'waiter',
  pin TEXT NOT NULL, -- 4-digit staff PIN
  is_workflow_staff BOOLEAN NOT NULL DEFAULT true,
  base_daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products (Menu Items)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  description TEXT DEFAULT '',
  base_price NUMERIC(10, 2) NOT NULL,
  station_target public.station_target NOT NULL DEFAULT 'bar',
  is_resold_outside_food BOOLEAN NOT NULL DEFAULT false,
  original_cost NUMERIC(10, 2),
  auto_86 BOOLEAN NOT NULL DEFAULT false,
  out_of_stock_reason TEXT,
  allergens TEXT[] DEFAULT '{}',
  dietary TEXT[] DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw Inventory Items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.inventory_category NOT NULL,
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  unit TEXT NOT NULL, -- 'kg', 'L', 'pcs', 'ml', 'g'
  min_alert_level NUMERIC(12, 3) NOT NULL DEFAULT 1.000,
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  supplier_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipe Bill of Materials (BOM)
CREATE TABLE public.product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 4) NOT NULL,
  unit TEXT NOT NULL,
  conversion_factor NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, inventory_item_id)
);

-- Product Modifiers
CREATE TABLE public.product_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modifier Ingredient Deltas
CREATE TABLE public.modifier_ingredient_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_id UUID NOT NULL REFERENCES public.product_modifiers(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  amount_delta NUMERIC(12, 4) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Movements (Immutable Audit Ledger)
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  movement_type public.stock_movement_type NOT NULL,
  change_amount NUMERIC(12, 4) NOT NULL,
  balance_before NUMERIC(12, 4) NOT NULL DEFAULT 0.000,
  balance_after NUMERIC(12, 4) NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Waste & Spillage Logs
CREATE TABLE public.waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 4) NOT NULL,
  cost_lost NUMERIC(10, 2) NOT NULL,
  reason public.waste_reason NOT NULL,
  reported_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Physical Tables
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  zone public.table_zone NOT NULL DEFAULT 'CAFE_AREA',
  capacity INTEGER NOT NULL DEFAULT 4,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer Tabs
CREATE TABLE public.tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  order_type public.order_type NOT NULL DEFAULT 'DINE_IN',
  order_channel public.order_channel NOT NULL DEFAULT 'CAFE_AREA',
  external_order_ref TEXT,
  rider_name TEXT,
  has_corkage_fee BOOLEAN NOT NULL DEFAULT false,
  corkage_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status public.tab_status NOT NULL DEFAULT 'OPEN',
  operating_mode public.operating_mode NOT NULL DEFAULT 'CAFE',
  opened_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_type public.order_type NOT NULL DEFAULT 'DINE_IN',
  order_channel public.order_channel NOT NULL DEFAULT 'CAFE_AREA',
  external_order_ref TEXT,
  status public.order_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  modifiers JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status public.item_status NOT NULL DEFAULT 'PENDING',
  station_target public.station_target NOT NULL DEFAULT 'bar',
  is_depleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table Transfer Logs
CREATE TABLE public.table_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
  origin_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  target_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  transferred_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Attendance & Daily Salary Expense Records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true,
  base_daily_pay NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  addon_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_day_pay NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Thermal Print Jobs Queue
CREATE TABLE public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'RUNNER_CHIT', 'RECEIPT', 'DELIVERY_TAG'
  receipt_data JSONB NOT NULL,
  status public.print_job_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_at TIMESTAMPTZ
);

-- 4. STORED PROCEDURES (ATOMIC PL/PGSQL FUNCTIONS)

-- Authenticate Staff PIN
CREATE OR REPLACE FUNCTION public.authenticate_staff_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, username, display_name, role, is_workflow_staff, is_active
  INTO v_user
  FROM public.users
  WHERE pin = p_pin AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid staff PIN or inactive account';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'isWorkflowStaff', v_user.is_workflow_staff
    )
  );
END;
$$;

-- Atomic Order Dispatch with Recipe Depletion & Auto-86
CREATE OR REPLACE FUNCTION public.dispatch_order_with_depletion(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_ing RECORD;
  v_current_stock NUMERIC;
  v_balance_before NUMERIC;
  v_depleted_count INTEGER := 0;
BEGIN
  -- 1. Mark Order as in preparation
  UPDATE public.orders
  SET status = 'IN_PREPARATION', updated_at = now()
  WHERE id = p_order_id;

  -- 2. Iterate each item in order
  FOR v_item IN 
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, p.name AS product_name
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.is_depleted = false
  LOOP
    -- Mark item as preparing
    UPDATE public.order_items
    SET status = 'PREPARING', is_depleted = true, updated_at = now()
    WHERE id = v_item.order_item_id;

    -- Deduct Recipe BOM ingredients
    FOR v_ing IN
      SELECT inventory_item_id, amount, conversion_factor
      FROM public.product_ingredients
      WHERE product_id = v_item.product_id
    LOOP
      -- Lock inventory row for update
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      -- Calculate and deduct stock
      UPDATE public.inventory_items
      SET current_stock = current_stock - (v_ing.amount * v_item.quantity * v_ing.conversion_factor),
          updated_at = now()
      WHERE id = v_ing.inventory_item_id
      RETURNING current_stock INTO v_current_stock;

      -- Record Immutable Stock Movement Audit
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
        -(v_ing.amount * v_item.quantity * v_ing.conversion_factor),
        v_balance_before,
        v_current_stock,
        p_order_id::text
      );

      -- Auto-86 Check: Disable product if ingredient stock drops to 0 or below
      IF v_current_stock <= 0 THEN
        UPDATE public.products
        SET auto_86 = true,
            out_of_stock_reason = 'Recipe Ingredient Depleted',
            updated_at = now()
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    v_depleted_count := v_depleted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'itemsDepleted', v_depleted_count
  );
END;
$$;

-- Atomic Table Transfer Procedure
CREATE OR REPLACE FUNCTION public.transfer_table_tab(
  p_origin_table_id UUID,
  p_target_table_id UUID,
  p_tab_id UUID,
  p_staff_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_tabs INTEGER;
BEGIN
  -- Reassign Tab
  UPDATE public.tabs
  SET table_id = p_target_table_id, updated_at = now()
  WHERE id = p_tab_id;

  -- Mark target table as occupied
  UPDATE public.tables
  SET is_occupied = true, updated_at = now()
  WHERE id = p_target_table_id;

  -- Check remaining open tabs on origin table
  SELECT COUNT(*) INTO v_remaining_tabs
  FROM public.tabs
  WHERE table_id = p_origin_table_id AND status = 'OPEN';

  IF v_remaining_tabs = 0 THEN
    UPDATE public.tables
    SET is_occupied = false, updated_at = now()
    WHERE id = p_origin_table_id;
  END IF;

  -- Audit log
  INSERT INTO public.table_transfer_logs (
    tab_id, origin_table_id, target_table_id, transferred_by_id, reason
  ) VALUES (
    p_tab_id, p_origin_table_id, p_target_table_id, p_staff_id, p_reason
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. SUPABASE REALTIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tabs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;

-- 6. STORAGE BUCKET FOR MENU IMAGES
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;
