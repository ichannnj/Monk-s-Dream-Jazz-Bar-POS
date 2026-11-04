-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Menu Image Storage Hardening & Media Uploads
-- Migration: 20261105000001_menu_image_storage_and_media_uploads.sql
--
-- Applies:
--   - Supabase Storage best practices: file_size_limit (5MB), allowed_mime_types, DELETE policy
--   - PostgreSQL best practices: TEXT types, CHECK constraints, FK indexes,
--     SECURITY DEFINER atomic RPC with explicit search_path
-- ==============================================================================

-- 1. Harden 'menu-images' bucket with 5MB limit and strict image MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage object policies for menu-images (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  -- 1. Public Read Access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Menu Images'
  ) THEN
    CREATE POLICY "Public Access for Menu Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'menu-images');
  END IF;

  -- 2. Staff Upload Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Upload Menu Images'
  ) THEN
    CREATE POLICY "Staff Upload Menu Images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'menu-images' AND
      (storage.foldername(name))[1] = 'items'
    );
  END IF;

  -- 3. Staff Update Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Update Menu Images'
  ) THEN
    CREATE POLICY "Staff Update Menu Images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'menu-images' AND
      (storage.foldername(name))[1] = 'items'
    );
  END IF;

  -- 4. Staff Delete Policy (Required for orphan and replaced image cleanup)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Delete Menu Images'
  ) THEN
    CREATE POLICY "Staff Delete Menu Images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'menu-images' AND
      (storage.foldername(name))[1] = 'items'
    );
  END IF;
END $$;

-- 2. Extend public.products with storage metadata columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS image_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS image_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS image_updated_at TIMESTAMPTZ;

-- Validate image_url format and prevent raw base64 data blobs from bloating PostgreSQL rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_products_image_url_http'
    AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT chk_products_image_url_http
    CHECK (image_url IS NULL OR image_url ~* '^https?://');
  END IF;
END $$;

-- 3. Create public.product_media_uploads audit log table
CREATE TABLE IF NOT EXISTS public.product_media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'menu-images',
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_media_uploads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_media_uploads' AND policyname = 'Allow public read on product_media_uploads'
  ) THEN
    CREATE POLICY "Allow public read on product_media_uploads"
    ON public.product_media_uploads FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_media_uploads' AND policyname = 'Allow all write on product_media_uploads'
  ) THEN
    CREATE POLICY "Allow all write on product_media_uploads"
    ON public.product_media_uploads FOR ALL USING (true);
  END IF;
END $$;

-- Foreign key indexes (schema-foreign-key-indexes.md)
CREATE INDEX IF NOT EXISTS idx_product_media_uploads_product_id
  ON public.product_media_uploads(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_uploads_uploaded_by
  ON public.product_media_uploads(uploaded_by);

-- 4. Atomic Stored Procedure: Record Product Image Upload & Return Previous Storage Path
CREATE OR REPLACE FUNCTION public.record_product_image_upload(
  p_product_id UUID,
  p_public_url TEXT,
  p_storage_path TEXT,
  p_mime_type TEXT DEFAULT 'image/webp',
  p_size_bytes INTEGER DEFAULT NULL,
  p_width INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_original_filename TEXT DEFAULT NULL,
  p_uploaded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_storage_path TEXT;
  v_cleaned_url TEXT := NULLIF(btrim(p_public_url), '');
  v_cleaned_path TEXT := NULLIF(btrim(p_storage_path), '');
  v_product RECORD;
BEGIN
  -- Grab old storage path before updating to allow client to remove old file from storage
  SELECT image_storage_path INTO v_old_storage_path
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with ID % not found', p_product_id;
  END IF;

  -- Update product row
  UPDATE public.products
  SET
    image_url = v_cleaned_url,
    image_storage_path = v_cleaned_path,
    image_mime_type = p_mime_type,
    image_size_bytes = p_size_bytes,
    image_updated_at = now(),
    updated_at = now()
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  -- Insert media audit row if path is provided
  IF v_cleaned_path IS NOT NULL AND v_cleaned_url IS NOT NULL THEN
    INSERT INTO public.product_media_uploads (
      product_id,
      bucket_id,
      storage_path,
      public_url,
      original_filename,
      mime_type,
      size_bytes,
      width,
      height,
      uploaded_by
    ) VALUES (
      p_product_id,
      'menu-images',
      v_cleaned_path,
      v_cleaned_url,
      p_original_filename,
      COALESCE(p_mime_type, 'image/webp'),
      COALESCE(p_size_bytes, 0),
      p_width,
      p_height,
      p_uploaded_by
    );
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product.id,
    'name', v_product.name,
    'image_url', v_product.image_url,
    'image_storage_path', v_product.image_storage_path,
    'old_storage_path', v_old_storage_path,
    'updated_at', v_product.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_product_image_upload(
  UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, UUID
) TO authenticated, anon, service_role;

