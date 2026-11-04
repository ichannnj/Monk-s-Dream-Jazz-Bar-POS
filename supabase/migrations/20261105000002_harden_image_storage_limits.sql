-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Calibrate Image Storage Limits
-- Migration: 20261105000002_harden_image_storage_limits.sql
--
-- Defense-in-depth:
--   - Client accepts uncompressed phone photos up to 8 MB and compresses to ~30 KB
--   - Supabase Storage bucket permits up to 8 MB (8,388,608 bytes) with strict image MIME types
-- ==============================================================================

UPDATE storage.buckets
SET
  file_size_limit = 8388608, -- 8 MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'menu-images';

