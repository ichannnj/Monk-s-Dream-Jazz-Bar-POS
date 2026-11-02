-- Migration: 20261102000002_reconcile_table_occupancy_and_orphaned_tabs.sql
-- Description: Clean up orphaned empty tabs, synchronize table occupancy, and add automatic trigger + admin release RPC

-- 1. Close abandoned empty tabs that have 0 orders
UPDATE public.tabs t
SET status = 'CLOSED', updated_at = now()
WHERE status = 'OPEN'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o WHERE o.tab_id = t.id
  );

-- 2. Reconcile tables is_occupied flag strictly against live OPEN tabs
UPDATE public.tables t
SET is_occupied = EXISTS (
  SELECT 1 FROM public.tabs tab
  WHERE tab.table_id = t.id AND tab.status = 'OPEN'
),
updated_at = now();

-- 3. Automatic Trigger to keep tables.is_occupied continuously in sync
CREATE OR REPLACE FUNCTION public.sync_table_occupancy_from_tabs()
RETURNS TRIGGER AS $$
DECLARE
  v_table_id UUID;
  v_has_open_tabs BOOLEAN;
BEGIN
  v_table_id := COALESCE(NEW.table_id, OLD.table_id);
  IF v_table_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tabs
      WHERE table_id = v_table_id AND status = 'OPEN'
    ) INTO v_has_open_tabs;

    UPDATE public.tables
    SET is_occupied = v_has_open_tabs,
        updated_at = now()
    WHERE id = v_table_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_table_occupancy ON public.tabs;
CREATE TRIGGER trg_sync_table_occupancy
AFTER INSERT OR UPDATE OR DELETE ON public.tabs
FOR EACH ROW EXECUTE FUNCTION public.sync_table_occupancy_from_tabs();

-- 4. Stored Procedure for Admin Emergency Table Release
CREATE OR REPLACE FUNCTION public.admin_force_release_table(p_table_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_closed_tabs INT;
BEGIN
  -- Close any open tabs on this table
  UPDATE public.tabs
  SET status = 'CLOSED', updated_at = now()
  WHERE table_id = p_table_id AND status = 'OPEN';
  GET DIAGNOSTICS v_closed_tabs = ROW_COUNT;

  -- Ensure table is freed
  UPDATE public.tables
  SET is_occupied = false, updated_at = now()
  WHERE id = p_table_id;

  RETURN jsonb_build_object(
    'success', true,
    'tableId', p_table_id,
    'closedTabsCount', v_closed_tabs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
