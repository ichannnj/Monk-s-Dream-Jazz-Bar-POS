-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Order Sub-Rounds Migration
-- Migration: 20261019000002_add_order_round_number.sql
-- ==============================================================================

-- Add round_number to orders table for tracking sub-order batches (Round 1, Round 2, etc.)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.orders.round_number IS 'Sub-order batch number for an active tab (e.g. 1 for initial order, 2 for round 2 drinks)';
