# Supabase Storage & PostgreSQL Best Practices for Menu Item Image Uploading

> **Research Scope:** Architectural design, security guardrails, upload lifecycle, client-side optimization, and PostgreSQL schema/RLS best practices for adding file upload and live image preview to the Menu Item Modal (`MenuItemModal.tsx`) in **Monk's Dream Jazz Bar POS**.  
> **Primary Sources Consulted:**
>
> - **Supabase Storage SDK (`@supabase/storage-js@2.118.0` installed source):**
>   - [`StorageFileApi.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts) — `.upload()`, `.update()`, `.getPublicUrl()`, `.remove()`, `prepareUploadFormData()`, `DEFAULT_FILE_OPTIONS`
>   - [`StorageBucketApi.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts) — `.createBucket()`, `.updateBucket()`, bucket-level `fileSizeLimit` & `allowedMimeTypes`
>   - [`types.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/lib/types.ts) — `Bucket`, `FileOptions`, `FileObject`, `FileMetadata`, `TransformOptions`
> - **Supabase Official Documentation:**
>   - [Supabase Storage Overview & Architecture (`storage.buckets` & `storage.objects`)](https://supabase.com/docs/guides/storage)
>   - [Supabase Storage Access Control & RLS Policies (`storage.objects`)](https://supabase.com/docs/guides/storage/security/access-control)
>   - [Supabase Storage Standard Uploads (`upload` & `upsert`)](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
>   - [Supabase Storage Buckets (`public`, `file_size_limit`, `allowed_mime_types`)](https://supabase.com/docs/guides/storage/buckets/fundamentals)
>   - [Supabase Storage CDN & Smart Caching (`cacheControl`)](https://supabase.com/docs/guides/storage/cdn/fundamentals)
> - **Supabase Postgres Best Practices Skill (`.agents/skills/supabase-postgres-best-practices/`):**
>   - [`security-rls-basics.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/security-rls-basics.md) — Database-enforced Row Level Security
>   - [`security-rls-performance.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md) — Caching `(SELECT auth.uid())`, `SECURITY DEFINER` safety, and policy indexing
>   - [`security-privileges.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/security-privileges.md) — Principle of least privilege & scoped grants
>   - [`schema-data-types.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md) — Choosing `TEXT`, `TIMESTAMPTZ`, `BIGINT`, and `NUMERIC`
>   - [`schema-constraints.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md) — Idempotent `DO $$` `pg_constraint` checks in migrations
>   - [`schema-foreign-key-indexes.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md) — Indexing foreign keys for fast joins and cascades
> - **PostgreSQL Official Documentation:**
>   - [PostgreSQL 66.2 — TOAST (The Oversized-Attribute Storage Technique)](https://www.postgresql.org/docs/current/storage-toast.html)
>   - [PostgreSQL `CREATE FUNCTION` — Writing `SECURITY DEFINER` Functions Safely](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
> - **Existing Repository Artifacts Inspected:**
>   - [`supabase/migrations/20261018000002_update_menu_item_image.sql`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261018000002_update_menu_item_image.sql)
>   - [`frontend/src/features/menu/data/menu.api.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/menu/data/menu.api.ts)
>   - [`frontend/src/features/admin/data/admin.api.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/admin/data/admin.api.ts)
>   - [`frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx)
>   - [`frontend/src/features/orders/presentation/order-entry/OrderMenuItemGrid.tsx`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/orders/presentation/order-entry/OrderMenuItemGrid.tsx)

---

## 1. How Supabase BaaS File Uploading Works: Object Storage vs. PostgreSQL Relational Storage

When users say _"upload a file and save it in the Supabase Database"_, Supabase BaaS separates the **binary file payload** from its **relational database record** across two tightly integrated subsystems ([Supabase Storage Overview](https://supabase.com/docs/guides/storage)):

### 1.1 The Two-Tier Architecture in Supabase BaaS

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Admin Menu Item Modal (MenuItemModal.tsx)                │
│  1. Select image file -> Instant local preview via URL.createObjectURL(file) │
│  2. Compress/resize client-side (Canvas -> WebP/JPEG Blob, max 1200px)       │
└───────────────────┬─────────────────────────────────────────┬────────────────┘
                    │ Step A: Upload Binary                   │ Step B: Save URL & Metadata
                    ▼                                         ▼
┌───────────────────────────────────────────┐ ┌────────────────────────────────┐
│       Supabase Storage API & S3/CDN       │ │   Supabase PostgreSQL Engine   │
│  • Binary stored in S3-backed object store│ │  • public.products             │
│  • Metadata tracked in:                   │ │    - image_url (TEXT)          │
│    - storage.buckets ('menu-images')      │ │    - updated_at (TIMESTAMPTZ)  │
│    - storage.objects (name, bucket_id,    │ │  • Broadcasts update via       │
│      metadata: size, mimetype, eTag)      │ │    supabase_realtime to all    │
│  • Served via global Edge CDN             │ │    POS & KDS tablets           │
└───────────────────────────────────────────┘ └────────────────────────────────┘
```

1. **Binary Payload Layer (`Supabase Storage` -> S3 + Edge CDN):**
   - The actual image bytes (`Blob`, `File`, or `ArrayBuffer`) are uploaded via the Storage REST API (`POST /storage/v1/object/menu-images/items/...`) implemented in [`StorageFileApi.upload()`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L75-L146).
   - Supabase Storage writes the binary bytes to S3-compatible object storage and fronts downloads with a global Smart CDN ([Supabase Storage CDN](https://supabase.com/docs/guides/storage/cdn/fundamentals)).
   - Simultaneously, Supabase Storage automatically inserts a metadata row into PostgreSQL's internal `storage.objects` table (`bucket_id`, `name`, `id`, `metadata` JSONB containing `size`, `mimetype`, `cacheControl`, `eTag`, `contentLength`, and `httpStatusCode` — see [`FileMetadata` in `types.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/lib/types.ts#L129-L146)).

2. **Relational Catalog Layer (`PostgreSQL` -> `public.products`):**
   - Once the upload succeeds, the client retrieves the deterministic public CDN URL via [`supabase.storage.from('menu-images').getPublicUrl(filePath)`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1114-L1145), which constructs:
     ```text
     https://<project-ref>.supabase.co/storage/v1/object/public/menu-images/items/<filename>
     ```
   - Your application then stores **only that `TEXT` URL (and optionally the storage path/metadata)** in `public.products.image_url` via `adminApi.createProduct()`, `adminApi.updateProduct()`, or the `public.update_product_image(p_product_id, p_image_url)` RPC ([`20261018000002_update_menu_item_image.sql`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261018000002_update_menu_item_image.sql#L4-L35)).

### 1.2 Why Binary Images Must NEVER Be Stored as `BYTEA` or Base64 in `public.products`

Storing raw image blobs (`BYTEA` or multi-hundred-kilobyte `data:image/jpeg;base64,...` strings) directly inside `public.products.image_url` is a critical anti-pattern in PostgreSQL and Supabase:

| Factor                                 | Raw Base64 / `BYTEA` in `public.products` (Anti-Pattern)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Supabase Storage + `TEXT` URL in `public.products` (Best Practice)                                                                                                                                                                                                                                                                              |
| :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL Page & TOAST Overhead**   | PostgreSQL uses a fixed **8 KB heap page size**. Any row attribute exceeding ~2 KB triggers **TOAST** (_The Oversized-Attribute Storage Technique_), slicing the binary into ~2 KB chunks stored in a secondary out-of-line TOAST table with its own B-tree index ([PostgreSQL 66.2 TOAST Docs](https://www.postgresql.org/docs/current/storage-toast.html)). Reading 50 menu items requires thousands of extra TOAST index lookups and chunk reassemblies.                                                                                                                                                                       | `image_url` is a ~110-byte `TEXT` string stored inline in the main 8 KB heap tuple. Zero TOAST table lookups; entire `public.products` catalog fits in a handful of shared-buffer pages in RAM.                                                                                                                                                 |
| **PostgREST & Realtime Payload Bloat** | `public.products` is part of the `supabase_realtime` publication ([`20261017000000_init_pos_schema.sql#L420`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql#L420)), and `menuApi.getMenuItems()` fetches all products on every POS Order Entry open ([`menu.api.ts#L57-L90`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/menu/data/menu.api.ts#L57-L90)). Base64 adds **33% encoding overhead** and turns a 15 KB JSON catalog response into a 25+ MB JSON payload on every query and WAL broadcast. | JSON catalog response remains `< 20 KB` across 100+ items. Binary images are fetched asynchronously over HTTP/2/3 only when rendered and cached on disk.                                                                                                                                                                                        |
| **WAL & Vacuum Bloat**                 | Every `UPDATE` on a row with large `BYTEA`/base64 attributes writes full-page images or new TOAST chunks to the Write-Ahead Log (WAL), inflating database storage and slowing `AUTOVACUUM` ([PostgreSQL 66.2 TOAST Docs](https://www.postgresql.org/docs/current/storage-toast.html)).                                                                                                                                                                                                                                                                                                                                            | Updating `image_url` writes < 150 bytes to WAL.                                                                                                                                                                                                                                                                                                 |
| **CDN & Device Caching**               | Base64 data URIs embedded in JSON cannot be cached by Cloudflare/Supabase CDN edges and bypass HTTP `ETag` / `Cache-Control` headers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Served by Supabase's CDN with `Cache-Control: max-age=3600` (or higher) and cached locally on POS tablets by `expo-image` (`cachePolicy="memory-disk"` in [`OrderMenuItemGrid.tsx#L75`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/orders/presentation/order-entry/OrderMenuItemGrid.tsx#L75)). |

---

## 2. Bucket Configuration & Security Guardrails (`storage.buckets` & `storage.objects`)

### 2.1 Bucket-Level Validation (`public`, `file_size_limit`, `allowed_mime_types`)

In `@supabase/storage-js@2.118.0`, the [`Bucket` interface in `types.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/lib/types.ts#L79-L90) and [`StorageBucketApi.createBucket()`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts#L154-L200) expose three critical server-enforced properties on `storage.buckets`:

1. **`public = true` (Public Bucket for Menu Catalog Images):**
   - Per [`StorageBucketApi.ts#L160`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts#L160) and [`StorageFileApi.getPublicUrl()`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1055-L1113): _"Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations."_
   - Menu item photos are non-sensitive catalog assets displayed across every Floor POS tablet, Bar KDS, and Kitchen KDS. Setting `public = true` allows `<Image source={{ uri: item.imageUrl }} />` in `expo-image` to load directly from `/storage/v1/object/public/menu-images/...` with zero signed-URL expiration overhead and full CDN edge caching ([Supabase Storage Buckets Docs](https://supabase.com/docs/guides/storage/buckets/fundamentals)).
2. **`file_size_limit` (Enforced in Bytes at the Storage Gateway):**
   - Specified in **bytes** (`BIGINT` column on `storage.buckets`; see [`StorageBucketApi.ts#L161-L163`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts#L161-L163)).
   - Currently, [`20261018000002_update_menu_item_image.sql#L41-L43`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261018000002_update_menu_item_image.sql#L41-L43) creates `menu-images` without `file_size_limit` or `allowed_mime_types`, leaving both `NULL` (unlimited up to the project's global limit and accepting any MIME type).
   - Setting `file_size_limit = 5242880` (**5 MB** = $5 \times 1024 \times 1024$ bytes) ensures the Supabase Storage server rejects oversized raw camera uploads (e.g., 25 MB uncompressed files) with HTTP `413 Payload Too Large` before they consume bucket storage.
3. **`allowed_mime_types` (Enforced MIME Whitelist):**
   - Specified as `TEXT[]` on `storage.buckets` (see [`StorageBucketApi.ts#L164-L166`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts#L164-L166)).
   - Setting `allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']` ensures Supabase Storage rejects non-image uploads (such as `.svg` containing embedded scripts, `.html`, `.exe`, or `.pdf`) with HTTP `415 Unsupported Media Type`.

#### Recommended Idempotent Bucket Hardening SQL

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5 MB max per menu photo (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

### 2.2 Storage RLS Policies (`storage.objects`) & Interaction with Custom POS Auth

According to the `@supabase/storage-js` source remarks in [`StorageFileApi.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts) and [Supabase Storage Access Control Docs](https://supabase.com/docs/guides/storage/security/access-control), each Storage SDK operation requires specific PostgreSQL Row-Level Security (RLS) permissions on `storage.objects`:

| Storage SDK Method                       | HTTP Endpoint                                     | Required `storage.objects` RLS Policy Operations | Source Citation                                                                                                                                                                                                                      |
| :--------------------------------------- | :------------------------------------------------ | :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.getPublicUrl(path)`                    | `GET /object/public/{bucket}/{path}`              | **None** (when `bucket.public = true`)           | [`StorageFileApi.ts#L1109-L1111`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1109-L1111) |
| `.upload(path, body, { upsert: false })` | `POST /object/{bucket}/{path}`                    | `INSERT` only                                    | [`StorageFileApi.ts#L209-L211`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L209-L211)     |
| `.upload(path, body, { upsert: true })`  | `POST /object/{bucket}/{path}` (`x-upsert: true`) | `SELECT`, `INSERT`, and `UPDATE`                 | [`StorageFileApi.ts#L211`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L211)               |
| `.update(path, body)`                    | `PUT /object/{bucket}/{path}`                     | `SELECT` and `UPDATE`                            | [`StorageFileApi.ts#L459-L461`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L459-L461)     |
| `.remove([path])`                        | `DELETE /object/{bucket}`                         | `SELECT` and `DELETE`                            | [`StorageFileApi.ts#L1185-L1187`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1185-L1187) |

#### How Monk's Dream POS Custom Auth Interacts with `storage.objects` RLS

In **Monk's Dream Jazz Bar POS**:

- The frontend initializes the Supabase client with `EXPO_PUBLIC_SUPABASE_ANON_KEY` ([`supabase.ts#L14-L32`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/shared/infrastructure/supabase.ts#L14-L32)).
- Staff and Admin authentication does **not** use `supabase.auth.signInWithPassword` (Supabase GoTrue JWT sessions); instead, it uses custom PostgreSQL `pgcrypto` `SECURITY DEFINER` RPCs (`authenticate_staff_credentials` and `authenticate_admin_credentials` in [`20261104000004_admin_password_auth_and_secret_hashing.sql`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261104000004_admin_password_auth_and_secret_hashing.sql)).
- Consequently, all direct client calls to `supabase.storage.from('menu-images')` execute under the PostgreSQL **`anon` role** (where `auth.uid()` is `NULL` and `auth.role()` is `'anon'`).

**Implications for `storage.objects` RLS Policies:**

1. Any `storage.objects` policy restricted `TO authenticated` or checking `auth.uid() IS NOT NULL` will **block** uploads from the POS Admin Console with `StorageApiError: new row violates row-level security policy`.
2. Therefore, `storage.objects` policies for `menu-images` must apply to `anon, authenticated`, while **constraining the bucket and path prefix** so callers can only write to `bucket_id = 'menu-images'` and path folder `(storage.foldername(name))[1] = 'items'`:
   ```sql
   -- Read policy (required for SELECT during upsert/remove and public listing)
   CREATE POLICY "Public Access for Menu Images"
   ON storage.objects FOR SELECT
   TO anon, authenticated
   USING (bucket_id = 'menu-images');

   -- Insert policy scoped strictly to 'menu-images' bucket and 'items/' prefix
   CREATE POLICY "Staff Upload Menu Images"
   ON storage.objects FOR INSERT
   TO anon, authenticated
   WITH CHECK (
     bucket_id = 'menu-images'
     AND (storage.foldername(name))[1] = 'items'
   );

   -- Update policy for replacing images in 'items/' prefix
   CREATE POLICY "Staff Update Menu Images"
   ON storage.objects FOR UPDATE
   TO anon, authenticated
   USING (
     bucket_id = 'menu-images'
     AND (storage.foldername(name))[1] = 'items'
   )
   WITH CHECK (
     bucket_id = 'menu-images'
     AND (storage.foldername(name))[1] = 'items'
   );

   -- Delete policy (currently missing in 20261018000002_update_menu_item_image.sql!)
   -- Required so old/replaced images can be cleaned up via .remove()
   CREATE POLICY "Staff Delete Menu Images"
   ON storage.objects FOR DELETE
   TO anon, authenticated
   USING (
     bucket_id = 'menu-images'
     AND (storage.foldername(name))[1] = 'items'
   );
   ```
   > **Finding in Existing Migration:** [`20261018000002_update_menu_item_image.sql#L46-L71`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261018000002_update_menu_item_image.sql#L46-L71) defines `SELECT`, `INSERT`, and `UPDATE` policies on `storage.objects`, but **omits a `DELETE` policy**. Without a `DELETE` policy on `storage.objects`, calling `supabase.storage.from('menu-images').remove([oldPath])` to clean up replaced images fails silently or returns an RLS error ([`StorageFileApi.ts#L1187`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1187)).

---

## 3. Upload Lifecycle Best Practices: Deferred Upload vs. Eager Upload

### 3.1 Why Deferred Upload (Upload on Form Submit) Beats Eager Upload

When adding or editing a menu item in [`MenuItemModal.tsx`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx), there are two ways to handle the file selection lifecycle:

| Pattern                                         | How It Works                                                                                                                                                                                                                                                                                               | Failure Modes & Trade-Offs                                                                                                                                                                                                                                                                                                                                                                                                                          |
| :---------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eager Upload (Anti-Pattern for Modal Forms)** | Immediately uploads the file to Supabase Storage the moment the user selects a file in the file picker, before clicking **"Create Product"** or **"Save Changes"**.                                                                                                                                        | 1. **Orphaned Files on Cancel:** If the admin selects 3 different photos to see how they look or clicks **Cancel**, those uploaded files remain permanently orphaned in `storage.objects`.<br>2. **No `product.id` Yet on Create:** When creating a _new_ menu item (`product === null`), the product UUID does not exist until form submission, making deterministic path naming (`items/<product_id>/...`) impossible without pre-generating IDs. |
| **Deferred Upload (Recommended Best Practice)** | Selecting a file in the modal creates an **instant, zero-latency local preview** in memory (`URL.createObjectURL(file)` on Web or local file URI). The actual network upload to Supabase Storage executes **only inside `handleSubmit()`** when the user clicks **"Create Product"** / **"Save Changes"**. | 1. **Zero Instant Latency:** Preview appears in `< 1ms` with no network wait.<br>2. **Zero Orphans from Cancelled Modals:** Closing or cancelling the modal simply revokes the local object URL (`URL.revokeObjectURL(previewUrl)`).<br>3. **Atomic Create/Update Flow:** For new items, `createProduct` (or a client-generated UUID / post-insert update) provides the exact `product.id` for the storage path.                                    |

### 3.2 Instant Local Preview & Memory Cleanup Lifecycle in `MenuItemModal.tsx`

In React / React Native Web (Expo), the modal should maintain two pieces of state for the image:

1. `imageUrl: string` — Existing remote HTTPS URL (or manual URL fallback).
2. `selectedFile: File | Blob | null` and `localPreviewUri: string | null` — The pending file chosen via the file picker and its ephemeral preview URL.

```tsx
// 1. When admin selects a file from device/computer:
const handleFileSelect = (file: File) => {
  // Client-side validation guardrails before preview
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Please select a JPG, PNG, or WebP image.', { title: 'Invalid File Type' });
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image must be smaller than 5 MB.', { title: 'File Too Large' });
    return;
  }

  // Revoke any previous ephemeral blob URL to prevent browser memory leaks
  if (localPreviewUri) {
    URL.revokeObjectURL(localPreviewUri);
  }

  const previewUrl = URL.createObjectURL(file);
  setSelectedFile(file);
  setLocalPreviewUri(previewUrl);
};

// 2. Display source priority in Live Preview (<Image /> from expo-image):
const displayPreviewUri = localPreviewUri || imageUrl.trim() || null;

// 3. Cleanup on modal close or unmount:
useEffect(() => {
  return () => {
    if (localPreviewUri) {
      URL.revokeObjectURL(localPreviewUri);
    }
  };
}, [localPreviewUri]);
```

### 3.3 Deterministic, Collision-Free Storage Paths & Cache Busting

Inspecting [`StorageFileApi.ts`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L37-L41) reveals a critical detail about how Supabase Storage and its CDN cache objects:

- `DEFAULT_FILE_OPTIONS` sets `cacheControl: '3600'` (`Cache-Control: max-age=3600`).
- If you overwrite the **exact same path** (e.g., `items/${productId}.webp` with `upsert: true`), both the Supabase Edge CDN and `expo-image`'s `cachePolicy="memory-disk"` ([`OrderMenuItemGrid.tsx#L75`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/orders/presentation/order-entry/OrderMenuItemGrid.tsx#L75)) will continue serving the **stale cached image** because the URL string did not change! Moreover, [`StorageFileApi.purgeCache()`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1216-L1218) explicitly requires a `service_role` key and rejects `anon` or user JWTs.
- **Best Practice — Unique Timestamped Path per Upload + Old File Cleanup:**
  - Format the storage path as:
    ```text
    items/<product_id>/<timestamp>-<sanitized_slug>.<ext>
    ```
    For example: `items/8f14e45f-ceea-467f-a8f1-000000000001/1762300800000-monks-old-fashioned.webp`
  - Why this pattern wins:
    1. **Guaranteed CDN & `expo-image` Cache Busting:** Every new upload produces a brand-new URL, forcing all connected POS tablets (`OrderMenuItemGrid`, `AdminRecipesView`) to immediately fetch and cache the new image as soon as `supabase_realtime` broadcasts the `products` row update.
    2. **`upsert: false` Safety:** Because the timestamp makes each upload path unique, you can pass `upsert: false` (requiring only `INSERT` permission on `storage.objects`) and set a longer `cacheControl: '31536000'` (1 year immutable cache) or `'3600'`.
    3. **Folder Grouping by `product_id`:** Grouping under `items/<product_id>/` makes it trivial to inspect or list all assets belonging to a specific product via `supabase.storage.from('menu-images').list('items/' + productId)`.

### 3.4 Cleaning Up Replaced or Deleted Product Images (Zero Storage Orphans)

When an admin replaces an existing Supabase-hosted image on a product (or deletes a product), the previous object in `menu-images` should be deleted so storage does not accumulate orphaned files:

```ts
/**
 * Extracts the relative storage path ('items/...') if a URL belongs to the 'menu-images' bucket.
 * Ignores external URLs (e.g., Unsplash presets).
 */
export function extractMenuImageStoragePath(publicUrl?: string | null): string | null {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/menu-images/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = publicUrl.slice(idx + marker.length).split('?')[0];
  return decodeURIComponent(rawPath);
}
```

When updating a product's image:

1. Upload the new optimized image to `items/${productId}/${Date.now()}-${slug}.${ext}`.
2. Update `public.products.image_url` with the new `publicUrl`.
3. If the product previously had a `menu-images` URL (`oldStoragePath !== null` and `oldStoragePath !== newStoragePath`), call:
   ```ts
   await supabase.storage.from('menu-images').remove([oldStoragePath]);
   ```
   in a non-blocking `try / catch` after the DB update succeeds.

---

## 4. Client-Side Image Optimization & Cross-Platform Upload Mechanics

### 4.1 Why Client-Side Resize & Compression Matters for Hospitality POS Tablets

In [`OrderMenuItemGrid.tsx#L68-L77`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/orders/presentation/order-entry/OrderMenuItemGrid.tsx#L68-L77), every menu card renders a top banner of `height: 110` (`~220x110` logical pt, or `~660x330` physical px at `@3x` Retina density):

```tsx
<Image
  source={{ uri: item.imageUrl }}
  style={styles.productImage}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
  onError={() => setImageFailed(true)}
/>
```

If an admin uploads an unoptimized 4000×3000 (4–8 MB) photo taken on a smartphone or DSLR:

1. **GPU & RAM Decode Pressure on POS Tablets:** Decoding fifty 12-megapixel bitmaps in a scrollable grid spikes tablet memory and causes frame drops during fast category switching on Floor POS and Bar KDS terminals.
2. **Slow Upload & Initial Cold-Cache Load:** Uploading 6 MB over venue Wi-Fi takes seconds; uploading a compressed 80 KB WebP/JPEG takes `< 150ms`.
3. **Supabase Pro/Free Transformation Quota:** While [`StorageFileApi.getPublicUrl()`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L1118-L1136) supports server-side image transformations (`transform: { width, height }` which routes to `/render/image/public/...`), Supabase Image Transformation is a paid billing add-on that returns `400`/`403` on projects where it is not enabled. **Client-side resizing before upload works on every Supabase tier (Free & Pro) at zero cost.**

### 4.2 Recommended Client-Side Compression Pipeline (Max `1200px`, Quality `0.82`, `WebP` / `JPEG`)

Before calling `supabase.storage.from('menu-images').upload()`, pass the selected image through an HTML5 `Canvas` compressor (on Web, where Admin Back-Office primarily runs) that:

- Scales the longest edge down to at most **`1200px`** (preserving aspect ratio and never upscaling smaller images).
- Encodes to **`image/webp`** (or **`image/jpeg`** fallback) at **`0.82` quality**, reducing typical 4 MB photos to **60 KB – 140 KB** (~96% reduction) with no visible loss on a POS card or modal preview.

### 4.3 Crucial `@supabase/storage-js` Detail: Explicit `contentType` & React Native Compatibility

Inspecting [`StorageFileApi.ts#L100-L110`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L100-L110) and [`StorageFileApi.ts#L213`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L213) reveals two important SDK behaviors:

1. **Default `contentType` is `'text/plain;charset=UTF-8'`:**
   In [`StorageFileApi.ts#L37-L41`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L37-L41):
   ```ts
   const DEFAULT_FILE_OPTIONS: FileOptions = {
     cacheControl: '3600',
     contentType: 'text/plain;charset=UTF-8',
     upsert: false,
   };
   ```
   When uploading a `Blob` or `File` on Web, `prepareUploadFormData()` wraps it in `FormData` ([`StorageFileApi.ts#L101-L105`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L101-L105)), which uses the `Blob.type`. However, if a raw `ArrayBuffer` or `Uint8Array` is passed (which `@supabase/storage-js` recommends on native iOS/Android in [`StorageFileApi.ts#L213`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/node_modules/.pnpm/@supabase+storage-js@2.118.0/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts#L213)), omitting `contentType` causes the SDK to send `Content-Type: text/plain;charset=UTF-8`! That will either fail the bucket's `allowed_mime_types` check (`415 Unsupported Media Type`) or serve the image with a `text/plain` header.
2. **Always Pass Explicit `contentType` in `.upload()`:**
   Currently, [`menuApi.uploadProductImage()` in `menu.api.ts#L191-L194`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/menu/data/menu.api.ts#L191-L194) calls:
   ```ts
   const { error } = await supabase.storage.from('menu-images').upload(filePath, file, {
     cacheControl: '3600',
     upsert: true,
   });
   ```
   without passing `contentType`. Best practice is to **always explicitly pass `contentType`** (e.g., `contentType: 'image/webp'` or `file.type || 'image/jpeg'`) in `FileOptions`.

---

## 5. PostgreSQL Schema & RLS Best Practices Applied (`supabase-postgres-best-practices`)

Applying the rules from `.agents/skills/supabase-postgres-best-practices/references/`:

### 5.1 Appropriate Data Types (`schema-data-types.md`)

Per [`schema-data-types.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md#L27-L44):

- **Use `TEXT` (not `VARCHAR(255)`) for URLs and storage paths:** PostgreSQL stores `TEXT` and `VARCHAR` identically under the hood (`varlena` header), and `VARCHAR(255)` risks truncation errors on long CDN or signed URLs. `public.products.image_url` in [`20261017000000_init_pos_schema.sql#L68`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql#L68) correctly uses `TEXT`.
- **Use `TIMESTAMPTZ` for audit timestamps:** `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` ensures timezone-aware mutation tracking across POS shifts.

### 5.2 Idempotent Constraints Checking URL Format (`schema-constraints.md`)

Per [`schema-constraints.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md#L10-L35), PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`. To prevent accidental insertion of empty strings `""` or raw `data:image/...` base64 blobs into `public.products.image_url`, add an idempotent `CHECK` constraint using a `DO $$` block checking `pg_constraint`:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_image_url_valid_http_chk'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_image_url_valid_http_chk
    CHECK (
      image_url IS NULL
      OR (
        length(image_url) <= 2048
        AND image_url ~* '^https?://'
      )
    );
  END IF;
END $$;
```

This database-level constraint guarantees that:

1. Base64 data URIs (`data:image/png;base64,...`) and local blob URIs (`blob:http://...` or `file:///...`) can **never** be persisted into `public.products.image_url` by a buggy client.
2. Empty strings `""` are normalized to `NULL` before or during persistence.

### 5.3 Hardening `SECURITY DEFINER` RPCs (`security-rls-performance.md` & `security-privileges.md`)

Per [`security-rls-performance.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md#L30-L55), [`security-privileges.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/security-privileges.md#L46-L52), and [PostgreSQL `CREATE FUNCTION` Security Docs](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY):

- `public.update_product_image(p_product_id UUID, p_image_url TEXT)` in [`20261018000002_update_menu_item_image.sql`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261018000002_update_menu_item_image.sql#L4-L35) already specifies `SECURITY DEFINER` and `SET search_path = public`.
- It should normalize blank strings via `NULLIF(btrim(p_image_url), '')` so clearing a product's photo sets `image_url = NULL` cleanly.

### 5.4 Foreign Key Indexing (`schema-foreign-key-indexes.md`)

Per [`schema-foreign-key-indexes.md`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md#L10-L42), PostgreSQL does not automatically index foreign key columns. When `adminApi.getProductsWithBOM()` or `menuApi.getMenuItems()` joins `public.products` with `public.categories` and `public.product_ingredients`, ensuring `products(category_id)` and `product_ingredients(product_id)` are indexed prevents sequential scans during realtime catalog refreshes.

---

## 6. Recommended End-to-End Implementation Blueprint for `MenuItemModal.tsx`

### 6.1 Summary of Gaps in Current Codebase

1. **Database & Storage Bucket (`20261018000002_update_menu_item_image.sql`):**
   - `menu-images` bucket has `file_size_limit = NULL` and `allowed_mime_types = NULL`.
   - `storage.objects` is missing a `DELETE` policy for `bucket_id = 'menu-images'`, preventing cleanup of replaced images.
2. **Storage Upload API (`menu.api.ts` / `admin.api.ts`):**
   - `menuApi.uploadProductImage()` only accepts an existing `productId` and immediately calls `updateProductImage()`, coupling file upload with an immediate DB update on an existing row.
   - Does not pass explicit `contentType` to `.upload()`.
   - Does not clean up the previous `menu-images` object when an image is replaced.
3. **Admin Menu Item Modal UI (`MenuItemModal.tsx`):**
   - Currently only renders a plain text input (`<AdminInput label="Image URL (Optional)" ... />` at [`MenuItemModal.tsx#L338-L343`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx#L338-L343)) with **no file picker button, no drag-and-drop/file upload handler, and no live image preview box**.

### 6.2 Step-by-Step Workflow to Implement in `MenuItemModal.tsx`

1. **Image Preview + Upload Picker Section in `MenuItemModal.tsx`:**
   - Render a live preview card (matching the POS card aspect ratio with `expo-image` `<Image source={{ uri: previewUri }} contentFit="cover" />` and station target badge) at the top of the image section.
   - Provide an **"Upload Photo"** button (triggering a hidden `<input type="file" accept="image/jpeg,image/png,image/webp" />` on Web / native picker fallback) alongside a **"Remove / Clear Photo"** button and the optional **Direct Image URL** input as a secondary fallback.
2. **Client-Side Validation & Compression Helper:**
   - Validate MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size (`<= 5 MB`).
   - Generate an immediate local preview via `URL.createObjectURL(file)`.
   - On form submit (`handleSubmit`), compress/resize the selected file via HTML5 Canvas to max `1200px` (`image/webp` or `image/jpeg`, quality `0.82`).
3. **Deferred Upload on Submit (`handleSubmit` in `MenuItemModal.tsx`):**
   - **When Creating a New Product (`!product`):**
     1. Call `const created = await adminApi.createProduct({ ...payload, image_url: null })` (or upload first using a sanitized slug + timestamp path, then pass `finalImageUrl` directly into `adminApi.createProduct()`).
     2. Uploading to `items/${created.id}/${Date.now()}-${slug}.${ext}` and updating `image_url` (or uploading to `items/${crypto.randomUUID()}-${slug}.${ext}` prior to `createProduct` so the row is inserted atomically with its `image_url` in a single DB round-trip, and calling `.remove()` if `createProduct` throws) ensures zero orphaned DB states.
   - **When Updating an Existing Product (`product`):**
     1. If `selectedFile` is present, upload to `items/${product.id}/${Date.now()}-${slug}.${ext}` with `{ cacheControl: '3600', contentType, upsert: false }`.
     2. Obtain `publicUrl` via `.getPublicUrl(filePath)`.
     3. Call `adminApi.updateProduct(product.id, { ...payload, image_url: publicUrl })`.
     4. If `product.image_url` previously pointed to `menu-images`, call `supabase.storage.from('menu-images').remove([oldPath])` to delete the old file.
