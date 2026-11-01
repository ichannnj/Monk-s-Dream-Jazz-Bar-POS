-- ============================================================================
-- Monk's Dream Jazz Bar POS — Real Station Status & Heartbeat Tracking
-- Migration: 20261102000002_station_status_heartbeat.sql
-- Description:
--   1. Creates station_status table to track live connected KDS tablets.
--   2. Enables Row Level Security (RLS) and defines search_path.
--   3. Provides report_station_heartbeat RPC function for KDS workstations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.station_status (
  station_key TEXT PRIMARY KEY, -- 'bar', 'cafe', 'kitchen', 'runner'
  name TEXT NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat TIMESTAMPTZ,
  active_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.station_status ENABLE ROW LEVEL SECURITY;

-- Policies for public and authenticated access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_status' AND policyname = 'Allow public read on station_status'
  ) THEN
    CREATE POLICY "Allow public read on station_status" 
    ON public.station_status FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_status' AND policyname = 'Allow all write on station_status'
  ) THEN
    CREATE POLICY "Allow all write on station_status" 
    ON public.station_status FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed default initial station rows (initially offline until workstation connects)
INSERT INTO public.station_status (station_key, name, is_online, last_heartbeat)
VALUES 
  ('bar', 'Bar Counter', false, NULL),
  ('cafe', 'Barista Espresso', false, NULL),
  ('kitchen', 'Kitchen Hot Line', false, NULL),
  ('runner', 'FOH Expediter', false, NULL)
ON CONFLICT (station_key) DO UPDATE
SET updated_at = now();

-- Station Heartbeat RPC function
CREATE OR REPLACE FUNCTION public.report_station_heartbeat(
  p_station_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_is_online BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.station_status (
    station_key,
    name,
    is_online,
    last_heartbeat,
    active_user_id,
    updated_at
  )
  VALUES (
    p_station_key,
    CASE 
      WHEN p_station_key = 'bar' THEN 'Bar Counter'
      WHEN p_station_key = 'cafe' THEN 'Barista Espresso'
      WHEN p_station_key = 'kitchen' THEN 'Kitchen Hot Line'
      ELSE 'FOH Expediter'
    END,
    p_is_online,
    CASE WHEN p_is_online THEN now() ELSE NULL END,
    CASE WHEN p_is_online THEN p_user_id ELSE NULL END,
    now()
  )
  ON CONFLICT (station_key) DO UPDATE
  SET is_online = p_is_online,
      last_heartbeat = CASE WHEN p_is_online THEN now() ELSE station_status.last_heartbeat END,
      active_user_id = CASE WHEN p_is_online THEN p_user_id ELSE NULL END,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'station_key', p_station_key,
    'is_online', p_is_online,
    'updated_at', now()
  );
END;
$$;
