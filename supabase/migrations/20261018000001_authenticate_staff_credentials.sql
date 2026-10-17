-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Secure Staff Credential Authentication
-- Migration: 20261018000001_authenticate_staff_credentials.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.authenticate_staff_credentials(
  p_username TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_clean_username TEXT;
  v_clean_pin TEXT;
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_pin := trim(COALESCE(p_pin, ''));

  -- 1. Strict validation: Both username and PIN are strictly required
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

  -- 2. Strict pairing: Both username AND PIN must match for the active account
  SELECT id, username, display_name, role, is_active, is_workflow_staff
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND pin = v_clean_pin
    AND is_active = true;

  IF NOT FOUND THEN
    -- Generic security denial: Do not reveal whether username or PIN was the mismatched component
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
  END IF;

  -- 3. Return authenticated user payload
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

-- Grant execution to public anon role for POS tablet login
GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO service_role;
