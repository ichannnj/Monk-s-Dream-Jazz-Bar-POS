-- Migration: Realtime Publications & Replica Identity Expansion
-- Ensures public.users, public.categories, and public.attendance_records are in supabase_realtime publication
-- and configures REPLICA IDENTITY FULL for seamless CDC updates and deletes.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- 1. users
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'users'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;

    -- 2. categories
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'categories'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
    END IF;

    -- 3. attendance_records
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_records'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
    END IF;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL on core transactional tables so UPDATE and DELETE CDC events carry complete record payloads
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.tabs REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- Ensure RLS allows SELECT for anon and authenticated clients for real-time streaming
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY['users', 'categories', 'attendance_records', 'tables', 'tabs', 'orders', 'order_items'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow Realtime Read for %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow Realtime Read for %I" ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;

