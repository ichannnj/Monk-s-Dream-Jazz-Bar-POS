-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Admin Password Auth & Cryptographic Secret Hashing
-- Migration: 20261104000004_admin_password_auth_and_secret_hashing.sql
-- ==============================================================================

-- 1. Enable pgcrypto extension for bcrypt Blowfish hashing ($2a$10$)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Add secret hashes, audit timestamps, and last login tracking to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_updated_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 3. Automatic Secret Hashing Trigger
-- Ensures whenever pin is written or updated, it is cryptographically hashed with Blowfish (work factor 10)
-- and masked in the legacy column so plaintext secrets never persist at rest.
CREATE OR REPLACE FUNCTION public.trg_fn_hash_user_secrets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- PIN Hashing & Masking
  IF NEW.pin IS NOT NULL AND NEW.pin <> '' AND NEW.pin <> '****' THEN
    NEW.pin_hash := extensions.crypt(trim(NEW.pin), extensions.gen_salt('bf', 10));
    NEW.pin_updated_at := COALESCE(NEW.pin_updated_at, now());
    NEW.pin := '****';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_user_secrets ON public.users;
CREATE TRIGGER trg_hash_user_secrets
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_hash_user_secrets();

-- 4. Backfill existing staff PIN hashes and mask plaintext PINs
UPDATE public.users SET pin_hash = extensions.crypt('9999', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'miles_manager';
UPDATE public.users SET pin_hash = extensions.crypt('1111', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'coltrane_cashier';
UPDATE public.users SET pin_hash = extensions.crypt('2222', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'ella_waiter';
UPDATE public.users SET pin_hash = extensions.crypt('3333', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'monk_bar';
UPDATE public.users SET pin_hash = extensions.crypt('4444', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'bill_cafe';
UPDATE public.users SET pin_hash = extensions.crypt('5555', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'chet_kitchen';
UPDATE public.users SET pin_hash = extensions.crypt('6666', extensions.gen_salt('bf', 10)), pin = '****', pin_updated_at = now() WHERE lower(username) = 'max_runner';

-- Catch any remaining active workflow staff with non-empty, unmasked PINs
UPDATE public.users
SET pin_hash = extensions.crypt(trim(pin), extensions.gen_salt('bf', 10)),
    pin = '****',
    pin_updated_at = now()
WHERE pin IS NOT NULL AND pin <> '' AND pin <> '****' AND (pin_hash IS NULL OR pin_hash = '');

-- 5. Seed default Admin Password for 'miles_manager' and any admin accounts: 'MonksDream9999!'
UPDATE public.users
SET password_hash = extensions.crypt('MonksDream9999!', extensions.gen_salt('bf', 10)),
    password_updated_at = now()
WHERE role = 'admin' AND (password_hash IS NULL OR password_hash = '');

-- 6. Updated Staff PIN Authenticator (Blocks Admin accounts from logging in via PIN alone)
CREATE OR REPLACE FUNCTION public.authenticate_staff_credentials(
  p_username TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_clean_username TEXT;
  v_clean_pin TEXT;
  v_valid_pin BOOLEAN := false;
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_pin := trim(COALESCE(p_pin, ''));

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Staff ID / Username is required. Access denied.'
    );
  END IF;

  IF v_clean_pin = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PIN is required. Access denied.'
    );
  END IF;

  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         email, phone, avatar_url, base_daily_rate, pin_hash, last_login_at
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND is_active = true
    AND is_workflow_staff = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
  END IF;

  -- Block Admin accounts from using Staff PIN clock-in
  IF v_user.role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin accounts must sign in with their password via the Admin Portal tab.',
      'isAdmin', true
    );
  END IF;

  -- Verify cryptographic bcrypt PIN hash
  IF v_user.pin_hash IS NOT NULL AND v_user.pin_hash <> '' THEN
    v_valid_pin := (v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash));
  END IF;

  IF NOT v_valid_pin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
  END IF;

  -- Update last login audit timestamp
  UPDATE public.users SET last_login_at = now() WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'jobTitle', v_user.job_title,
      'isWorkflowStaff', v_user.is_workflow_staff,
      'email', v_user.email,
      'phone', v_user.phone,
      'avatarUrl', v_user.avatar_url,
      'baseDailyRate', v_user.base_daily_rate,
      'lastLoginAt', now()
    )
  );
END;
$$;

-- 7. Authenticate Admin Credentials (Username or Email + Password)
CREATE OR REPLACE FUNCTION public.authenticate_admin_credentials(
  p_identifier TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_clean_ident TEXT;
  v_clean_pass TEXT;
  v_valid_pass BOOLEAN := false;
BEGIN
  v_clean_ident := lower(trim(COALESCE(p_identifier, '')));
  v_clean_pass := COALESCE(p_password, '');

  IF v_clean_ident = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin Username or Email is required.'
    );
  END IF;

  IF v_clean_pass = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin Password is required.'
    );
  END IF;

  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         email, phone, avatar_url, base_daily_rate, password_hash, password_updated_at,
         pin_updated_at, last_login_at
  INTO v_user
  FROM public.users
  WHERE (lower(username) = v_clean_ident OR lower(COALESCE(email, '')) = v_clean_ident)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Admin credentials. Access denied.'
    );
  END IF;

  IF v_user.role <> 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied. Account is not assigned to an Administrator role.'
    );
  END IF;

  IF v_user.password_hash IS NULL OR v_user.password_hash = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No password configured for this Administrator. Please contact System Support.'
    );
  END IF;

  v_valid_pass := (v_user.password_hash = extensions.crypt(v_clean_pass, v_user.password_hash));

  IF NOT v_valid_pass THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Admin credentials. Access denied.'
    );
  END IF;

  UPDATE public.users SET last_login_at = now() WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'jobTitle', v_user.job_title,
      'isWorkflowStaff', v_user.is_workflow_staff,
      'email', v_user.email,
      'phone', v_user.phone,
      'avatarUrl', v_user.avatar_url,
      'baseDailyRate', v_user.base_daily_rate,
      'lastLoginAt', now(),
      'passwordUpdatedAt', v_user.password_updated_at,
      'pinUpdatedAt', v_user.pin_updated_at
    )
  );
END;
$$;

-- 8. Verify Floor POS Manager Override PIN
CREATE OR REPLACE FUNCTION public.verify_manager_override_pin(
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_clean_pin TEXT;
BEGIN
  v_clean_pin := trim(COALESCE(p_pin, ''));

  IF v_clean_pin = '' OR length(v_clean_pin) <> 4 THEN
    RETURN jsonb_build_object('success', false, 'error', '4-digit Manager PIN is required.');
  END IF;

  FOR v_user IN
    SELECT id, display_name, username, pin_hash
    FROM public.users
    WHERE role = 'admin' AND is_active = true AND pin_hash IS NOT NULL
  LOOP
    IF v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash) THEN
      RETURN jsonb_build_object(
        'success', true,
        'managerId', v_user.id,
        'managerName', v_user.display_name,
        'managerUsername', v_user.username
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Invalid Manager Override PIN. Authorization denied.'
  );
END;
$$;

-- 9. Update Admin Profile (Display Name, Username, Job Title, Email, Phone)
CREATE OR REPLACE FUNCTION public.update_admin_profile(
  p_user_id UUID,
  p_display_name TEXT,
  p_username TEXT,
  p_job_title TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean_username TEXT;
  v_clean_name TEXT;
  v_existing_id UUID;
  v_updated RECORD;
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_name := trim(COALESCE(p_display_name, ''));

  IF v_clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Display name cannot be empty.');
  END IF;

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username cannot be empty.');
  END IF;

  -- Check username collision
  SELECT id INTO v_existing_id
  FROM public.users
  WHERE lower(username) = v_clean_username AND id <> p_user_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username @' || v_clean_username || ' is already taken.');
  END IF;

  UPDATE public.users
  SET display_name = v_clean_name,
      username = v_clean_username,
      job_title = trim(COALESCE(p_job_title, '')),
      email = NULLIF(trim(COALESCE(p_email, '')), ''),
      phone = NULLIF(trim(COALESCE(p_phone, '')), ''),
      updated_at = now()
  WHERE id = p_user_id AND role = 'admin'
  RETURNING id, username, display_name, role, job_title, is_workflow_staff,
            email, phone, avatar_url, base_daily_rate, last_login_at,
            password_updated_at, pin_updated_at
  INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin user not found or unauthorized.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_updated.id,
      'username', v_updated.username,
      'displayName', v_updated.display_name,
      'role', v_updated.role,
      'jobTitle', v_updated.job_title,
      'isWorkflowStaff', v_updated.is_workflow_staff,
      'email', v_updated.email,
      'phone', v_updated.phone,
      'avatarUrl', v_updated.avatar_url,
      'baseDailyRate', v_updated.base_daily_rate,
      'lastLoginAt', v_updated.last_login_at,
      'passwordUpdatedAt', v_updated.password_updated_at,
      'pinUpdatedAt', v_updated.pin_updated_at
    )
  );
END;
$$;

-- 10. Change Admin Password (Gated by current password verification)
CREATE OR REPLACE FUNCTION public.change_admin_password(
  p_user_id UUID,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  IF p_current_password IS NULL OR p_current_password = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current password is required.');
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'New password must be at least 8 characters long.');
  END IF;

  SELECT password_hash INTO v_stored_hash
  FROM public.users
  WHERE id = p_user_id AND role = 'admin' AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin user not found or inactive.');
  END IF;

  IF v_stored_hash IS NULL OR v_stored_hash <> extensions.crypt(p_current_password, v_stored_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current password verification failed.');
  END IF;

  UPDATE public.users
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      password_updated_at = now(),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'passwordUpdatedAt', now()
  );
END;
$$;

-- 11. Change Admin Floor Override PIN (Gated by current password verification)
CREATE OR REPLACE FUNCTION public.change_admin_override_pin(
  p_user_id UUID,
  p_current_password TEXT,
  p_new_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_stored_hash TEXT;
  v_clean_pin TEXT;
BEGIN
  v_clean_pin := trim(COALESCE(p_new_pin, ''));

  IF p_current_password IS NULL OR p_current_password = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current admin password is required to rotate override PIN.');
  END IF;

  IF v_clean_pin !~ '^[0-9]{4}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'New Floor Override PIN must be exactly 4 numeric digits.');
  END IF;

  SELECT password_hash INTO v_stored_hash
  FROM public.users
  WHERE id = p_user_id AND role = 'admin' AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin user not found or inactive.');
  END IF;

  IF v_stored_hash IS NULL OR v_stored_hash <> extensions.crypt(p_current_password, v_stored_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current password verification failed. PIN not changed.');
  END IF;

  UPDATE public.users
  SET pin_hash = extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10)),
      pin = '****',
      pin_updated_at = now(),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'pinUpdatedAt', now()
  );
END;
$$;

-- 12. Create Staff Account Supporting Optional Initial Password for Admins
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
  v_new_id UUID;
  v_pin_hash TEXT := NULL;
  v_pass_hash TEXT := NULL;
BEGIN
  v_clean_name := trim(COALESCE(p_display_name, ''));
  v_clean_user := lower(trim(COALESCE(p_username, '')));
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
    v_clean_role::user_role,
    NULLIF(trim(COALESCE(p_job_title, '')), ''),
    COALESCE(p_base_daily_rate, 645.00),
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    NULLIF(trim(COALESCE(p_email, '')), ''),
    true,
    true
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_new_id,
    'username', v_clean_user
  );
END;
$$;

-- Grant Execution to App Roles
GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authenticate_admin_credentials(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_manager_override_pin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_admin_password(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_admin_override_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_staff_account_with_secrets(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

