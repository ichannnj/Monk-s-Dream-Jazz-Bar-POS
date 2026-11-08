-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Drop Legacy settle_tab_and_record_payment Overloads
-- Migration: 20261108000009_drop_legacy_settle_tab_overload.sql
-- Description:
--   Migration 20261108000006 added the 21-parameter signature
--   (p_tendered_amount, p_drawer_target, p_should_print_receipt) but never
--   dropped the legacy 18-parameter signature. Because every trailing argument
--   has a DEFAULT, PostgREST sees two viable candidates whenever a caller omits
--   any of those three trailing parameters and fails with:
--
--     PGRST203: Could not choose the best candidate function between:
--       settle_tab_and_record_payment(... 18 args ...)
--       settle_tab_and_record_payment(... 21 args ...)
--
--   This migration removes every stale overload while preserving the canonical
--   21-parameter implementation created by migration
--   20261108000008_fix_settle_tab_json_arg_limit.sql.
-- ==============================================================================

DO $$
DECLARE
  v_fn RECORD;
BEGIN
  FOR v_fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'settle_tab_and_record_payment'
      AND p.pronargs <> 21
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', v_fn.signature);
  END LOOP;
END;
$$;
