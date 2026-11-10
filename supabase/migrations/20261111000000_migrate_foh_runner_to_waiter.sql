-- ============================================================================
-- Monk's Dream Jazz Bar POS — Role Consolidation: Migrate FOH Runner to Waiter
-- Migration: 20261111000000_migrate_foh_runner_to_waiter.sql
-- ============================================================================

UPDATE public.users
SET role = 'waiter',
    job_title = 'Floor Waiter & Server',
    updated_at = now()
WHERE role = 'foh_runner';

-- Ensure the 'runner' station status entry remains seeded and labeled properly
INSERT INTO public.station_status (station_key, name, is_online, last_heartbeat)
VALUES ('runner', 'FOH Expediter', false, NULL)
ON CONFLICT (station_key) DO UPDATE
SET name = 'FOH Expediter',
    updated_at = now();
