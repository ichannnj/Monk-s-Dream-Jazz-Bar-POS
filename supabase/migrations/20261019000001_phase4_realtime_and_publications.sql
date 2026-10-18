-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Phase 4 Realtime Publications & Sync Additions
-- Migration: 20261019000001_phase4_realtime_and_publications.sql
-- ==============================================================================

-- 1. Add table_transfer_logs to realtime publication so tablets reactively update on transfers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'table_transfer_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_transfer_logs;
  END IF;
END $$;

-- 2. Add full replica identity so old/new records are broadcast completely for realtime consumers
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.tabs REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.table_transfer_logs REPLICA IDENTITY FULL;
ALTER TABLE public.print_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.cash_drawer_transactions REPLICA IDENTITY FULL;
