-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Payroll Cutoff Runs, Adjustments & Payout Tracking
-- Migration: 20261127000001_payroll_cutoffs_and_payouts.sql
-- ==============================================================================

-- 1. Venue Settings: Default Payroll Cutoff Cadence
ALTER TABLE public.venue_settings
  ADD COLUMN IF NOT EXISTS payroll_cadence TEXT NOT NULL DEFAULT 'SEMI_MONTHLY',
  ADD COLUMN IF NOT EXISTS payroll_cutoff_day_1 INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS payroll_cutoff_day_2 INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS payroll_payday_lag_days INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_venue_payroll_cadence'
  ) THEN
    ALTER TABLE public.venue_settings
      ADD CONSTRAINT chk_venue_payroll_cadence
      CHECK (payroll_cadence IN ('SEMI_MONTHLY', 'WEEKLY', 'CUSTOM'));
  END IF;
END $$;

-- 2. Payroll Runs (Cutoff Batches)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'SEMI_MONTHLY' CHECK (cadence IN ('SEMI_MONTHLY', 'WEEKLY', 'CUSTOM')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payday_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED', 'PARTIALLY_PAID', 'PAID', 'VOIDED')),
  staff_count INT NOT NULL DEFAULT 0,
  total_shifts INT NOT NULL DEFAULT 0,
  total_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  gross_pay_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  additions_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deductions_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_pay_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  created_by_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  finalized_by_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ NULL,
  voided_by_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ NULL,
  void_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payroll_run_dates CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period
  ON public.payroll_runs(period_start DESC, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status
  ON public.payroll_runs(status, created_at DESC);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- 3. Payroll Run Items (Per-Employee Snapshot & Payout State)
CREATE TABLE IF NOT EXISTS public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_username TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  job_title TEXT NULL,
  is_workflow_staff BOOLEAN NOT NULL DEFAULT true,
  is_payroll_exempt BOOLEAN NOT NULL DEFAULT false,
  shifts_worked INT NOT NULL DEFAULT 0,
  regular_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  overtime_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  hours_worked NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  base_pay_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  overtime_pay_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  shift_bonus_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cutoff_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  service_charge_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  other_additions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  additions_notes TEXT NULL,
  cash_advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sss_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  philhealth_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pagibig_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deductions_notes TEXT NULL,
  gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payout_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payout_status IN ('PENDING', 'PAID', 'EXEMPT')),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NULL CHECK (payment_method IN ('CASH', 'GCASH', 'BANK_TRANSFER', 'OTHER')),
  payment_reference TEXT NULL,
  payment_notes TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  paid_by_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  cash_drawer_tx_id UUID NULL REFERENCES public.cash_drawer_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payroll_run_user UNIQUE (payroll_run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_items_run
  ON public.payroll_run_items(payroll_run_id, payout_status);

ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;

-- 4. Append-Only Payroll Audit Logs
CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_run
  ON public.payroll_audit_logs(payroll_run_id, created_at DESC);

ALTER TABLE public.payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Consistent with POS authenticated/anon local-first admin pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_runs' AND policyname = 'Allow all access to payroll_runs') THEN
    CREATE POLICY "Allow all access to payroll_runs" ON public.payroll_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_run_items' AND policyname = 'Allow all access to payroll_run_items') THEN
    CREATE POLICY "Allow all access to payroll_run_items" ON public.payroll_run_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_audit_logs' AND policyname = 'Allow all access to payroll_audit_logs') THEN
    CREATE POLICY "Allow all access to payroll_audit_logs" ON public.payroll_audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Realtime Publication
ALTER TABLE public.payroll_runs REPLICA IDENTITY FULL;
ALTER TABLE public.payroll_run_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_runs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_run_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 7. Helper: Recompute Parent Payroll Run Totals
CREATE OR REPLACE FUNCTION public.recompute_payroll_run_totals(p_run_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
  v_agg RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE NOT is_payroll_exempt) AS eligible_count,
    COALESCE(SUM(shifts_worked), 0) AS sum_shifts,
    COALESCE(SUM(hours_worked), 0.00) AS sum_hours,
    COALESCE(SUM(gross_pay) FILTER (WHERE NOT is_payroll_exempt), 0.00) AS sum_gross,
    COALESCE(SUM(cutoff_bonus + service_charge_share + other_additions) FILTER (WHERE NOT is_payroll_exempt), 0.00) AS sum_additions,
    COALESCE(SUM(cash_advance_deduction + sss_deduction + philhealth_deduction + pagibig_deduction + tax_deduction + other_deductions) FILTER (WHERE NOT is_payroll_exempt), 0.00) AS sum_deductions,
    COALESCE(SUM(net_pay) FILTER (WHERE NOT is_payroll_exempt), 0.00) AS sum_net,
    COALESCE(SUM(paid_amount) FILTER (WHERE NOT is_payroll_exempt AND payout_status = 'PAID'), 0.00) AS sum_paid,
    COUNT(*) FILTER (WHERE NOT is_payroll_exempt AND payout_status = 'PENDING') AS pending_count,
    COUNT(*) FILTER (WHERE NOT is_payroll_exempt AND payout_status = 'PAID') AS paid_count
  INTO v_agg
  FROM public.payroll_run_items
  WHERE payroll_run_id = p_run_id;

  v_new_status := v_run.status;
  IF v_run.status IN ('FINALIZED', 'PARTIALLY_PAID', 'PAID') THEN
    IF v_agg.paid_count > 0 AND v_agg.pending_count = 0 THEN
      v_new_status := 'PAID';
    ELSIF v_agg.paid_count > 0 AND v_agg.pending_count > 0 THEN
      v_new_status := 'PARTIALLY_PAID';
    ELSE
      v_new_status := 'FINALIZED';
    END IF;
  END IF;

  UPDATE public.payroll_runs
  SET
    staff_count = COALESCE(v_agg.eligible_count, 0),
    total_shifts = COALESCE(v_agg.sum_shifts, 0),
    total_hours = ROUND(COALESCE(v_agg.sum_hours, 0.00)::NUMERIC, 2),
    gross_pay_total = ROUND(COALESCE(v_agg.sum_gross, 0.00)::NUMERIC, 2),
    additions_total = ROUND(COALESCE(v_agg.sum_additions, 0.00)::NUMERIC, 2),
    deductions_total = ROUND(COALESCE(v_agg.sum_deductions, 0.00)::NUMERIC, 2),
    net_pay_total = ROUND(COALESCE(v_agg.sum_net, 0.00)::NUMERIC, 2),
    paid_amount_total = ROUND(COALESCE(v_agg.sum_paid, 0.00)::NUMERIC, 2),
    status = v_new_status,
    updated_at = now()
  WHERE id = p_run_id;
END;
$$;

-- 8. Preview or Create Draft Payroll Run
CREATE OR REPLACE FUNCTION public.preview_or_create_payroll_run(
  p_period_start DATE,
  p_period_end DATE,
  p_cadence TEXT DEFAULT 'SEMI_MONTHLY',
  p_title TEXT DEFAULT NULL,
  p_payday_date DATE DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_preview_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_overlap RECORD;
  v_run_id UUID;
  v_run_code TEXT;
  v_title TEXT;
  v_payday DATE;
  v_unresolved JSONB;
  v_items JSONB;
  v_staff RECORD;
  v_gross NUMERIC(12, 2);
BEGIN
  IF p_period_end < p_period_start THEN
    RETURN jsonb_build_object('success', false, 'error', 'Period end date must be on or after start date.');
  END IF;

  -- Block overlapping non-voided cutoffs
  SELECT id, run_code, title, period_start, period_end, status
  INTO v_overlap
  FROM public.payroll_runs
  WHERE status <> 'VOIDED'
    AND daterange(period_start, period_end, '[]') && daterange(p_period_start, p_period_end, '[]')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Overlaps with existing cutoff %s (%s to %s).', v_overlap.run_code, v_overlap.period_start, v_overlap.period_end),
      'conflictingRun', jsonb_build_object(
        'id', v_overlap.id,
        'runCode', v_overlap.run_code,
        'title', v_overlap.title,
        'periodStart', v_overlap.period_start,
        'periodEnd', v_overlap.period_end,
        'status', v_overlap.status
      )
    );
  END IF;

  -- Unresolved attendance warnings in range
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'recordId', ar.id,
    'userId', ar.user_id,
    'displayName', u.display_name,
    'date', ar.date,
    'shiftStatus', ar.shift_status,
    'needsReview', ar.needs_review,
    'reviewReason', ar.review_reason
  ) ORDER BY ar.date DESC, u.display_name ASC), '[]'::jsonb)
  INTO v_unresolved
  FROM public.attendance_records ar
  JOIN public.users u ON u.id = ar.user_id
  WHERE ar.date BETWEEN p_period_start AND p_period_end
    AND (ar.needs_review = true OR ar.shift_status = 'CLOCKED_IN');

  IF p_preview_only THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT
        u.id AS user_id,
        u.display_name AS employee_name,
        u.username AS employee_username,
        u.role AS employee_role,
        u.job_title,
        u.is_workflow_staff,
        (u.role = 'admin') AS is_payroll_exempt,
        COALESCE(COUNT(ar.id) FILTER (WHERE ar.is_present), 0)::INT AS shifts_worked,
        ROUND(COALESCE(SUM(ar.regular_hours) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS regular_hours,
        ROUND(COALESCE(SUM(ar.overtime_hours) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS overtime_hours,
        ROUND(COALESCE(SUM(ar.hours_worked) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS hours_worked,
        CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.base_daily_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS base_pay_total,
        CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.overtime_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS overtime_pay_total,
        CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.addon_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS shift_bonus_total,
        CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.total_day_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS gross_pay
      FROM public.users u
      LEFT JOIN public.attendance_records ar
        ON ar.user_id = u.id
        AND ar.date BETWEEN p_period_start AND p_period_end
      WHERE u.is_active = true
      GROUP BY u.id
      HAVING COUNT(ar.id) FILTER (WHERE ar.is_present) > 0 OR u.is_active = true
      ORDER BY (u.role = 'admin') ASC, u.display_name ASC
    ) t;

    RETURN jsonb_build_object(
      'success', true,
      'preview', true,
      'unresolvedWarnings', v_unresolved,
      'items', v_items
    );
  END IF;

  v_title := COALESCE(NULLIF(trim(p_title), ''), format('%s – %s', to_char(p_period_start, 'Mon DD'), to_char(p_period_end, 'Mon DD, YYYY')));
  v_payday := COALESCE(p_payday_date, p_period_end);
  v_run_code := format('PAY-%s-%s', to_char(p_period_start, 'YYYYMMDD'), upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 4)));

  INSERT INTO public.payroll_runs (
    run_code, title, cadence, period_start, period_end, payday_date, status, created_by_id
  ) VALUES (
    v_run_code, v_title, COALESCE(p_cadence, 'SEMI_MONTHLY'), p_period_start, p_period_end, v_payday, 'DRAFT', p_actor_id
  )
  RETURNING id INTO v_run_id;

  FOR v_staff IN
    SELECT
      u.id AS user_id,
      u.display_name,
      u.username,
      u.role,
      u.job_title,
      u.is_workflow_staff,
      (u.role = 'admin') AS is_exempt,
      COALESCE(COUNT(ar.id) FILTER (WHERE ar.is_present), 0)::INT AS shifts_worked,
      ROUND(COALESCE(SUM(ar.regular_hours) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS regular_hours,
      ROUND(COALESCE(SUM(ar.overtime_hours) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS overtime_hours,
      ROUND(COALESCE(SUM(ar.hours_worked) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS hours_worked,
      CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.base_daily_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS base_pay,
      CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.overtime_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS ot_pay,
      CASE WHEN u.role = 'admin' THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.addon_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS bonus_pay
    FROM public.users u
    LEFT JOIN public.attendance_records ar
      ON ar.user_id = u.id
      AND ar.date BETWEEN p_period_start AND p_period_end
    WHERE u.is_active = true
    GROUP BY u.id
  LOOP
    v_gross := CASE WHEN v_staff.is_exempt THEN 0.00 ELSE ROUND((v_staff.base_pay + v_staff.ot_pay + v_staff.bonus_pay)::NUMERIC, 2) END;

    INSERT INTO public.payroll_run_items (
      payroll_run_id, user_id, employee_name, employee_username, employee_role, job_title,
      is_workflow_staff, is_payroll_exempt, shifts_worked, regular_hours, overtime_hours,
      hours_worked, base_pay_total, overtime_pay_total, shift_bonus_total,
      gross_pay, net_pay, payout_status
    ) VALUES (
      v_run_id, v_staff.user_id, v_staff.display_name, v_staff.username, v_staff.role, v_staff.job_title,
      v_staff.is_workflow_staff, v_staff.is_exempt, v_staff.shifts_worked, v_staff.regular_hours, v_staff.overtime_hours,
      v_staff.hours_worked, v_staff.base_pay, v_staff.ot_pay, v_staff.bonus_pay,
      v_gross, v_gross, CASE WHEN v_staff.is_exempt THEN 'EXEMPT' ELSE 'PENDING' END
    );
  END LOOP;

  PERFORM public.recompute_payroll_run_totals(v_run_id);

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id, details)
  VALUES (v_run_id, 'CREATE_DRAFT', p_actor_id, jsonb_build_object('periodStart', p_period_start, 'periodEnd', p_period_end));

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_run_created', 'run_id', v_run_id)::TEXT);

  RETURN jsonb_build_object('success', true, 'runId', v_run_id, 'runCode', v_run_code, 'unresolvedWarnings', v_unresolved);
END;
$$;

-- 9. Refresh Draft Payroll Run from Attendance
CREATE OR REPLACE FUNCTION public.refresh_draft_payroll_run(
  p_run_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
  v_item RECORD;
  v_agg RECORD;
  v_gross NUMERIC(12, 2);
  v_additions NUMERIC(12, 2);
  v_deductions NUMERIC(12, 2);
  v_net NUMERIC(12, 2);
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found.');
  END IF;
  IF v_run.status <> 'DRAFT' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only DRAFT payroll runs can be refreshed from attendance.');
  END IF;

  FOR v_item IN SELECT * FROM public.payroll_run_items WHERE payroll_run_id = p_run_id LOOP
    SELECT
      COALESCE(COUNT(ar.id) FILTER (WHERE ar.is_present), 0)::INT AS shifts_worked,
      ROUND(COALESCE(SUM(ar.regular_hours) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS regular_hours,
      ROUND(COALESCE(SUM(ar.overtime_hours) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS overtime_hours,
      ROUND(COALESCE(SUM(ar.hours_worked) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) AS hours_worked,
      CASE WHEN v_item.is_payroll_exempt THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.base_daily_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS base_pay,
      CASE WHEN v_item.is_payroll_exempt THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.overtime_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS ot_pay,
      CASE WHEN v_item.is_payroll_exempt THEN 0.00 ELSE ROUND(COALESCE(SUM(ar.addon_pay) FILTER (WHERE ar.is_present), 0.00)::NUMERIC, 2) END AS bonus_pay
    INTO v_agg
    FROM public.attendance_records ar
    WHERE ar.user_id = v_item.user_id
      AND ar.date BETWEEN v_run.period_start AND v_run.period_end;

    v_gross := CASE WHEN v_item.is_payroll_exempt THEN 0.00 ELSE ROUND((v_agg.base_pay + v_agg.ot_pay + v_agg.bonus_pay)::NUMERIC, 2) END;
    v_additions := CASE WHEN v_item.is_payroll_exempt THEN 0.00 ELSE (v_item.cutoff_bonus + v_item.service_charge_share + v_item.other_additions) END;
    v_deductions := CASE WHEN v_item.is_payroll_exempt THEN 0.00 ELSE (v_item.cash_advance_deduction + v_item.sss_deduction + v_item.philhealth_deduction + v_item.pagibig_deduction + v_item.tax_deduction + v_item.other_deductions) END;
    v_net := GREATEST(0.00, ROUND((v_gross + v_additions - v_deductions)::NUMERIC, 2));

    UPDATE public.payroll_run_items
    SET
      shifts_worked = v_agg.shifts_worked,
      regular_hours = v_agg.regular_hours,
      overtime_hours = v_agg.overtime_hours,
      hours_worked = v_agg.hours_worked,
      base_pay_total = v_agg.base_pay,
      overtime_pay_total = v_agg.ot_pay,
      shift_bonus_total = v_agg.bonus_pay,
      gross_pay = v_gross,
      net_pay = v_net,
      updated_at = now()
    WHERE id = v_item.id;
  END LOOP;

  PERFORM public.recompute_payroll_run_totals(p_run_id);

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id)
  VALUES (p_run_id, 'REFRESH_ATTENDANCE', p_actor_id);

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_run_refreshed', 'run_id', p_run_id)::TEXT);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Update Draft Item Adjustments
CREATE OR REPLACE FUNCTION public.update_payroll_run_item_adjustments(
  p_item_id UUID,
  p_cutoff_bonus NUMERIC DEFAULT 0.00,
  p_service_charge_share NUMERIC DEFAULT 0.00,
  p_other_additions NUMERIC DEFAULT 0.00,
  p_additions_notes TEXT DEFAULT NULL,
  p_cash_advance_deduction NUMERIC DEFAULT 0.00,
  p_sss_deduction NUMERIC DEFAULT 0.00,
  p_philhealth_deduction NUMERIC DEFAULT 0.00,
  p_pagibig_deduction NUMERIC DEFAULT 0.00,
  p_tax_deduction NUMERIC DEFAULT 0.00,
  p_other_deductions NUMERIC DEFAULT 0.00,
  p_deductions_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_item RECORD;
  v_run RECORD;
  v_additions NUMERIC(12, 2);
  v_deductions NUMERIC(12, 2);
  v_net NUMERIC(12, 2);
BEGIN
  SELECT * INTO v_item FROM public.payroll_run_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll line item not found.');
  END IF;

  SELECT * INTO v_run FROM public.payroll_runs WHERE id = v_item.payroll_run_id;
  IF v_run.status <> 'DRAFT' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustments are locked once the cutoff is Finalized.');
  END IF;
  IF v_item.is_payroll_exempt THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin accounts are strictly Payroll Exempt.');
  END IF;

  v_additions := GREATEST(0, COALESCE(p_cutoff_bonus, 0)) + GREATEST(0, COALESCE(p_service_charge_share, 0)) + GREATEST(0, COALESCE(p_other_additions, 0));
  v_deductions := GREATEST(0, COALESCE(p_cash_advance_deduction, 0)) + GREATEST(0, COALESCE(p_sss_deduction, 0)) + GREATEST(0, COALESCE(p_philhealth_deduction, 0)) + GREATEST(0, COALESCE(p_pagibig_deduction, 0)) + GREATEST(0, COALESCE(p_tax_deduction, 0)) + GREATEST(0, COALESCE(p_other_deductions, 0));
  v_net := GREATEST(0.00, ROUND((v_item.gross_pay + v_additions - v_deductions)::NUMERIC, 2));

  UPDATE public.payroll_run_items
  SET
    cutoff_bonus = GREATEST(0, COALESCE(p_cutoff_bonus, 0)),
    service_charge_share = GREATEST(0, COALESCE(p_service_charge_share, 0)),
    other_additions = GREATEST(0, COALESCE(p_other_additions, 0)),
    additions_notes = p_additions_notes,
    cash_advance_deduction = GREATEST(0, COALESCE(p_cash_advance_deduction, 0)),
    sss_deduction = GREATEST(0, COALESCE(p_sss_deduction, 0)),
    philhealth_deduction = GREATEST(0, COALESCE(p_philhealth_deduction, 0)),
    pagibig_deduction = GREATEST(0, COALESCE(p_pagibig_deduction, 0)),
    tax_deduction = GREATEST(0, COALESCE(p_tax_deduction, 0)),
    other_deductions = GREATEST(0, COALESCE(p_other_deductions, 0)),
    deductions_notes = p_deductions_notes,
    net_pay = v_net,
    updated_at = now()
  WHERE id = p_item_id;

  PERFORM public.recompute_payroll_run_totals(v_item.payroll_run_id);

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id, details)
  VALUES (v_item.payroll_run_id, 'UPDATE_ADJUSTMENTS', p_actor_id, jsonb_build_object('itemId', p_item_id, 'netPay', v_net));

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_item_adjusted', 'run_id', v_item.payroll_run_id)::TEXT);
  RETURN jsonb_build_object('success', true, 'netPay', v_net);
END;
$$;

-- 11. Finalize Payroll Run
CREATE OR REPLACE FUNCTION public.finalize_payroll_run(
  p_run_id UUID,
  p_actor_id UUID DEFAULT NULL,
  p_allow_unresolved BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
  v_unresolved_count INT;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found.');
  END IF;
  IF v_run.status <> 'DRAFT' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only DRAFT runs can be finalized.');
  END IF;

  SELECT COUNT(*) INTO v_unresolved_count
  FROM public.attendance_records
  WHERE date BETWEEN v_run.period_start AND v_run.period_end
    AND (needs_review = true OR shift_status = 'CLOCKED_IN');

  IF v_unresolved_count > 0 AND NOT p_allow_unresolved THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'UNRESOLVED_SHIFTS',
      'unresolvedCount', v_unresolved_count,
      'error', format('%s unresolved or open shift(s) exist in this cutoff.', v_unresolved_count)
    );
  END IF;

  UPDATE public.payroll_runs
  SET
    status = 'FINALIZED',
    finalized_by_id = p_actor_id,
    finalized_at = now(),
    updated_at = now()
  WHERE id = p_run_id;

  PERFORM public.recompute_payroll_run_totals(p_run_id);

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id, details)
  VALUES (p_run_id, 'FINALIZE', p_actor_id, jsonb_build_object('unresolvedBypassed', v_unresolved_count > 0));

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_run_finalized', 'run_id', p_run_id)::TEXT);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. Reopen Unpaid Finalized Run to Draft
CREATE OR REPLACE FUNCTION public.reopen_payroll_run_to_draft(
  p_run_id UUID,
  p_actor_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found.');
  END IF;
  IF v_run.status <> 'FINALIZED' OR v_run.paid_amount_total > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only unpaid FINALIZED cutoffs can be reopened to Draft.');
  END IF;
  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'An audit reason is required to reopen a finalized cutoff.');
  END IF;

  UPDATE public.payroll_runs
  SET status = 'DRAFT', finalized_by_id = NULL, finalized_at = NULL, updated_at = now()
  WHERE id = p_run_id;

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id, details)
  VALUES (p_run_id, 'REOPEN', p_actor_id, jsonb_build_object('reason', trim(p_reason)));

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_run_reopened', 'run_id', p_run_id)::TEXT);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 13. Record Payout (Single or Batch) with Optional Cash Drawer CASH_OUT
CREATE OR REPLACE FUNCTION public.record_payroll_payout(
  p_run_id UUID,
  p_item_ids UUID[],
  p_payment_method TEXT DEFAULT 'CASH',
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_deduct_cash_drawer BOOLEAN DEFAULT false,
  p_drawer_target TEXT DEFAULT 'main',
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
  v_item RECORD;
  v_drawer_tx_id UUID;
  v_total_disbursed NUMERIC(12, 2) := 0.00;
  v_count INT := 0;
  v_method TEXT := upper(COALESCE(p_payment_method, 'CASH'));
  v_target TEXT := lower(COALESCE(p_drawer_target, 'main'));
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found.');
  END IF;
  IF v_run.status NOT IN ('FINALIZED', 'PARTIALLY_PAID') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cutoff must be Finalized before recording payouts.');
  END IF;
  IF v_method NOT IN ('CASH', 'GCASH', 'BANK_TRANSFER', 'OTHER') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payout method.');
  END IF;

  FOR v_item IN
    SELECT * FROM public.payroll_run_items
    WHERE payroll_run_id = p_run_id
      AND id = ANY(p_item_ids)
      AND NOT is_payroll_exempt
      AND payout_status = 'PENDING'
  LOOP
    v_drawer_tx_id := NULL;
    IF p_deduct_cash_drawer AND v_method = 'CASH' AND v_item.net_pay > 0 THEN
      INSERT INTO public.cash_drawer_transactions (
        action_type, amount, reason, performed_by_id, drawer_target
      ) VALUES (
        'CASH_OUT',
        -ABS(v_item.net_pay),
        format('Payroll (%s): %s', v_run.run_code, v_item.employee_name),
        p_actor_id,
        CASE WHEN v_target = 'bar' THEN 'bar' ELSE 'main' END
      )
      RETURNING id INTO v_drawer_tx_id;
    END IF;

    UPDATE public.payroll_run_items
    SET
      payout_status = 'PAID',
      paid_amount = v_item.net_pay,
      payment_method = v_method,
      payment_reference = NULLIF(trim(COALESCE(p_reference, '')), ''),
      payment_notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      paid_at = now(),
      paid_by_id = p_actor_id,
      cash_drawer_tx_id = v_drawer_tx_id,
      updated_at = now()
    WHERE id = v_item.id;

    v_total_disbursed := v_total_disbursed + v_item.net_pay;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eligible pending employees selected.');
  END IF;

  PERFORM public.recompute_payroll_run_totals(p_run_id);

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id, details)
  VALUES (
    p_run_id,
    CASE WHEN v_count > 1 THEN 'PAY_ALL' ELSE 'PAY_EMPLOYEE' END,
    p_actor_id,
    jsonb_build_object('count', v_count, 'totalDisbursed', v_total_disbursed, 'method', v_method, 'drawerDeducted', p_deduct_cash_drawer AND v_method = 'CASH')
  );

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_payout_recorded', 'run_id', p_run_id)::TEXT);
  RETURN jsonb_build_object('success', true, 'paidCount', v_count, 'totalDisbursed', v_total_disbursed);
END;
$$;

-- 14. Void Payroll Run (Requires Manager PIN if any payouts recorded)
CREATE OR REPLACE FUNCTION public.void_payroll_run(
  p_run_id UUID,
  p_actor_id UUID DEFAULT NULL,
  p_manager_pin TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
  v_pin_ok BOOLEAN := false;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found.');
  END IF;
  IF v_run.status = 'VOIDED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll run is already voided.');
  END IF;
  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A void reason is required.');
  END IF;

  IF v_run.status IN ('PARTIALLY_PAID', 'PAID') OR v_run.paid_amount_total > 0 THEN
    IF NULLIF(trim(COALESCE(p_manager_pin, '')), '') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Manager Override PIN is required to void a paid cutoff.');
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.users
      WHERE role = 'admin' AND is_active = true
        AND pin_hash IS NOT NULL
        AND pin_hash = extensions.crypt(trim(p_manager_pin), pin_hash)
    ) INTO v_pin_ok;

    IF NOT v_pin_ok THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid Manager Override PIN.');
    END IF;
  END IF;

  UPDATE public.payroll_runs
  SET
    status = 'VOIDED',
    voided_by_id = p_actor_id,
    voided_at = now(),
    void_reason = trim(p_reason),
    updated_at = now()
  WHERE id = p_run_id;

  INSERT INTO public.payroll_audit_logs (payroll_run_id, action, actor_user_id, details)
  VALUES (p_run_id, 'VOID', p_actor_id, jsonb_build_object('reason', trim(p_reason)));

  PERFORM pg_notify('pos_global_sync', jsonb_build_object('reason', 'payroll_run_voided', 'run_id', p_run_id)::TEXT);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 15. Check Attendance Date Lock Against Finalized/Paid Cutoffs
CREATE OR REPLACE FUNCTION public.check_date_payroll_lock(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_run RECORD;
BEGIN
  SELECT id, run_code, title, period_start, period_end, status
  INTO v_run
  FROM public.payroll_runs
  WHERE status IN ('FINALIZED', 'PARTIALLY_PAID', 'PAID')
    AND p_date BETWEEN period_start AND period_end
  ORDER BY finalized_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('locked', false);
  END IF;

  RETURN jsonb_build_object(
    'locked', true,
    'runId', v_run.id,
    'runCode', v_run.run_code,
    'title', v_run.title,
    'periodStart', v_run.period_start,
    'periodEnd', v_run.period_end,
    'status', v_run.status
  );
END;
$$;
