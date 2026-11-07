-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Fix create_staff_account_with_secrets Enum Cast
-- Migration: 20261108000003_fix_create_staff_account_role_enum.sql
-- ==============================================================================

-- Fix invalid type cast v_clean_role::user_role to v_clean_role::public.role
CREATE OR REPLACE FUNCTION public.create_staff_account_with_secrets(
  p_display_name TEXT,
  p_username TEXT,
  p_pin TEXT,
  p_role TEXT,
  p_job_title TEXT DEFAULT NULL,
  p_base_daily_rate NUMERIC DEFAULT 645.00,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean_name TEXT;
  v_clean_user TEXT;
  v_clean_pin TEXT;
  v_clean_role TEXT;
  v_base_rate NUMERIC;
  v_new_id UUID;
  v_pin_hash TEXT := NULL;
  v_pass_hash TEXT := NULL;
BEGIN
  v_clean_name := trim(COALESCE(p_display_name, ''));
  -- Strip any leading '@' and spaces from username
  v_clean_user := lower(trim(regexp_replace(COALESCE(p_username, ''), '^@+', '')));
  v_clean_user := regexp_replace(v_clean_user, '\s+', '_', 'g');
  v_clean_pin := trim(COALESCE(p_pin, ''));
  v_clean_role := lower(trim(COALESCE(p_role, 'waiter')));

  IF v_clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Display name is required.');
  END IF;
  IF v_clean_user = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is required.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(username) = v_clean_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username @' || v_clean_user || ' is already taken.');
  END IF;

  IF v_clean_pin <> '' THEN
    IF v_clean_pin !~ '^[0-9]{4}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'PIN must be exactly 4 numeric digits.');
    END IF;
    v_pin_hash := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));
  END IF;

  IF v_clean_role = 'admin' THEN
    IF p_password IS NULL OR length(p_password) < 8 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin accounts require a password of at least 8 characters.');
    END IF;
    v_pass_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
    -- Invariant: Admin accounts are salary/management roles and do NOT receive daily shift pay
    v_base_rate := 0.00;
  ELSE
    v_base_rate := COALESCE(p_base_daily_rate, 645.00);
  END IF;

  INSERT INTO public.users (
    display_name,
    username,
    pin,
    pin_hash,
    password_hash,
    password_updated_at,
    pin_updated_at,
    role,
    job_title,
    base_daily_rate,
    phone,
    email,
    is_active,
    is_workflow_staff
  ) VALUES (
    v_clean_name,
    v_clean_user,
    '****',
    v_pin_hash,
    v_pass_hash,
    CASE WHEN v_pass_hash IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN v_pin_hash IS NOT NULL THEN now() ELSE NULL END,
    v_clean_role::public.role,
    NULLIF(trim(COALESCE(p_job_title, '')), ''),
    v_base_rate,
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    NULLIF(trim(COALESCE(p_email, '')), ''),
    true,
    true
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_new_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_account_with_secrets(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Ensure any existing admin accounts with NULL password_hash receive default 'MonksDream9999!'
UPDATE public.users
SET password_hash = extensions.crypt('MonksDream9999!', extensions.gen_salt('bf', 10)),
    password_updated_at = now()
WHERE role = 'admin' AND (password_hash IS NULL OR password_hash = '');

