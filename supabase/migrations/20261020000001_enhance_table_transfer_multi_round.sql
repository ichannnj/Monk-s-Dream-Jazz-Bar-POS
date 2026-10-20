-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Multi-Tab & Multi-Round Table Transfer Enhancement
-- Migration: 20261020000001_enhance_table_transfer_multi_round.sql
-- ==============================================================================

-- 1. Add transfer provenance columns to public.tabs
ALTER TABLE public.tabs
  ADD COLUMN IF NOT EXISTS transferred_from_table_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Enhanced stored procedure supporting both single-tab & entire-table transfers
CREATE OR REPLACE FUNCTION public.transfer_table_tab(
  p_origin_table_id UUID,
  p_target_table_id UUID,
  p_tab_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Guest relocation request'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_tabs INTEGER;
  v_transferred_count INTEGER := 0;
  v_effective_staff_id UUID;
  v_origin_table_number TEXT;
  v_tab_rec RECORD;
BEGIN
  -- Determine default staff ID if null
  IF p_staff_id IS NOT NULL THEN
    v_effective_staff_id := p_staff_id;
  ELSE
    SELECT id INTO v_effective_staff_id FROM public.users LIMIT 1;
  END IF;

  -- Fetch origin table code for KDS & runner alert provenance
  SELECT table_number INTO v_origin_table_number
  FROM public.tables
  WHERE id = p_origin_table_id;

  IF p_tab_id IS NOT NULL THEN
    -- 1. Single Specific Tab Transfer
    UPDATE public.tabs
    SET 
      table_id = p_target_table_id,
      transferred_from_table_code = COALESCE(v_origin_table_number, 'Previous Table'),
      transferred_at = now(),
      updated_at = now()
    WHERE id = p_tab_id AND table_id = p_origin_table_id;

    GET DIAGNOSTICS v_transferred_count = ROW_COUNT;

    IF v_transferred_count > 0 THEN
      INSERT INTO public.table_transfer_logs (
        tab_id, origin_table_id, target_table_id, transferred_by_id, reason
      ) VALUES (
        p_tab_id, p_origin_table_id, p_target_table_id, v_effective_staff_id, p_reason
      );
    END IF;
  ELSE
    -- 2. Entire Table Transfer (Move all open tabs)
    FOR v_tab_rec IN
      SELECT id FROM public.tabs
      WHERE table_id = p_origin_table_id AND status = 'OPEN'
    LOOP
      UPDATE public.tabs
      SET 
        table_id = p_target_table_id,
        transferred_from_table_code = COALESCE(v_origin_table_number, 'Previous Table'),
        transferred_at = now(),
        updated_at = now()
      WHERE id = v_tab_rec.id;

      INSERT INTO public.table_transfer_logs (
        tab_id, origin_table_id, target_table_id, transferred_by_id, reason
      ) VALUES (
        v_tab_rec.id, p_origin_table_id, p_target_table_id, v_effective_staff_id, p_reason
      );

      v_transferred_count := v_transferred_count + 1;
    END LOOP;
  END IF;

  -- 3. Mark destination table as occupied
  UPDATE public.tables
  SET is_occupied = true, updated_at = now()
  WHERE id = p_target_table_id;

  -- 4. Check remaining open tabs on origin table
  SELECT COUNT(*) INTO v_remaining_tabs
  FROM public.tabs
  WHERE table_id = p_origin_table_id AND status = 'OPEN';

  IF v_remaining_tabs = 0 THEN
    UPDATE public.tables
    SET is_occupied = false, updated_at = now()
    WHERE id = p_origin_table_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transferred_count', v_transferred_count,
    'origin_remaining_tabs', v_remaining_tabs,
    'origin_table_code', v_origin_table_number
  );
END;
$$;
