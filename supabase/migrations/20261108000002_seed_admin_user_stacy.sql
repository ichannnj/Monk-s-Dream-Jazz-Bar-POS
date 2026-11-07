-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Seed Administrator User Stacy
-- Migration: 20261108000002_seed_admin_user_stacy.sql
-- ==============================================================================

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
  email,
  is_active,
  is_workflow_staff
) VALUES (
  'Stacy',
  'stacy',
  '****',
  extensions.crypt('8888', extensions.gen_salt('bf', 10)),
  extensions.crypt('@MonksDream8', extensions.gen_salt('bf', 10)),
  now(),
  now(),
  'admin',
  'Administrator',
  0.00,
  'stacy@monksdream.com',
  true,
  true
)
ON CONFLICT (username) DO UPDATE
SET display_name = EXCLUDED.display_name,
    password_hash = EXCLUDED.password_hash,
    password_updated_at = now(),
    pin_hash = EXCLUDED.pin_hash,
    pin_updated_at = now(),
    role = 'admin',
    job_title = 'Administrator',
    base_daily_rate = 0.00,
    is_active = true,
    is_workflow_staff = true,
    updated_at = now();

