-- Migration: 20261018000002_update_menu_item_image.sql
-- Function to update a menu item's image URL with security and validation

CREATE OR REPLACE FUNCTION public.update_product_image(
  p_product_id UUID,
  p_image_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product public.products%ROWTYPE;
BEGIN
  -- Validate product exists and update image
  UPDATE public.products
  SET
    image_url = p_image_url,
    updated_at = now()
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with ID % not found', p_product_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_product.id,
    'name', v_product.name,
    'image_url', v_product.image_url,
    'updated_at', v_product.updated_at
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.update_product_image(UUID, TEXT) TO authenticated, anon, service_role;

-- Ensure storage bucket 'menu-images' exists and has open read/write access for POS staff
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies for menu-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Menu Images'
  ) THEN
    CREATE POLICY "Public Access for Menu Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'menu-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Staff Upload Menu Images'
  ) THEN
    CREATE POLICY "Staff Upload Menu Images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'menu-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Staff Update Menu Images'
  ) THEN
    CREATE POLICY "Staff Update Menu Images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'menu-images');
  END IF;
END $$;
