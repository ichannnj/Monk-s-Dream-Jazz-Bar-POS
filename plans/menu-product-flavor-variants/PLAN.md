# Plan: Product Flavor Variants with Single-Select Options

Status: approved design plan; implementation intentionally not started.

## Objective

Allow a menu item such as `Latte` to offer one mutually-exclusive flavor choice—`Classic`, `Spanish`, `Caramel`, or `Vanilla`—while preserving the existing temperature/size matrix and allowing multiple add-ons such as `Extra Shot`, `Oat Milk`, and `Cold Foam`.

Example order line:

```text
Latte — Spanish · Iced · 12oz
Add-ons: Oat Milk, Extra Shot
Unit price: ₱___
```

The implementation must not add a free-text `variant` column. A free-text value cannot prove product compatibility, enforce one-of selection, calculate an authoritative price, or select the correct inventory recipe.

## Settled product decisions

- Flavor is a separate single-select option group, not a multi-select add-on.
- Flavor can be combined with the existing temperature and size selections.
- Flavor pricing uses a price delta from the resolved base/temperature/size price.
- Flavor options can affect inventory and recipe depletion.
- Flavor definitions are reusable, but assignment to a product is explicit.
- Existing temperature/size variants and multi-select add-ons remain supported.
- The plan covers database, security, admin catalog, ordering, persistence, KDS, printing, inventory, testing, migration, and rollout.

## Current repository facts

The implementation agent must account for the following existing behavior:

| Area                                    | Current behavior                                                                                                                          | Required implication                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.product_variants`               | Stores `temperature`, `size_label`, absolute `price`, availability, SKU, and order.                                                       | Keep this for temperature/size sellable combinations in the first implementation. Do not misuse `size_label` for flavor.                           |
| `public.order_items`                    | Already has `variant_id`, `temperature`, `size_label`, `unit_price`, and JSONB `modifiers`.                                               | Add normalized flavor selection data while keeping `unit_price` as the historical final-price snapshot.                                            |
| `modifier_groups` / `product_modifiers` | Schema has `min_selections`, `max_selections`, and `is_required`, but order entry currently treats modifiers as a flat multi-select list. | Keep add-ons separate; wire group cardinality into both admin and order-entry behavior.                                                            |
| `order_items.modifiers`                 | Stores display strings, with a normalizer for double-encoded JSON.                                                                        | Do not use names as the new source of truth. Add stable IDs and snapshots; retain the old field only as a compatibility projection during rollout. |
| Menu UI                                 | `MenuItemVariantMatrixSection` supports only hot/cold and sizes. `MenuItemModifiersSection` is flat.                                      | Add a dedicated flavor-option section and group-aware add-on editing.                                                                              |
| Order UI                                | `OrderModifierModal` has one temperature, one size, and many selected modifier names.                                                     | Change state to selected option IDs by group and render radio controls for single-select groups.                                                   |
| Dispatch                                | `dispatch.api.ts` accepts variant fields, but dine-in, takeout, and delivery callers omit some variant fields.                            | Audit every caller and centralize validated persistence.                                                                                           |
| Hydration                               | Some hydration queries omit variant fields.                                                                                               | Fix reload behavior before declaring the feature complete.                                                                                         |
| Inventory                               | Variant-aware depletion was defined in `20261107000003`, then later trigger definitions may have overwritten that behavior.               | End with one final authoritative depletion function and regression tests.                                                                          |
| Variant upsert                          | `upsertProductVariants()` deletes and reinserts rows.                                                                                     | Replace with stable-ID upsert/archive behavior so historical order references are not nulled.                                                      |
| RLS                                     | Existing catalog policies are broad internal-POS policies.                                                                                | Define the intended staff/admin boundary explicitly; do not copy unrestricted write policies to new tables.                                        |

Relevant files:

- [existing product variant migration](../../supabase/migrations/20261107000003_product_variants_and_matrix_pricing.sql)
- [modifier catalog migration](../../supabase/migrations/20261108000007_product_modifiers_catalog_and_seeding.sql)
- [modifier JSONB normalizer](../../supabase/migrations/20261108000010_normalize_order_item_modifiers.sql)
- [menu mapper](../../frontend/src/features/menu/data/menuMapper.ts)
- [menu API](../../frontend/src/features/menu/data/menu.api.ts)
- [order-entry controller](../../frontend/src/features/orders/presentation/order-entry/useOrderEntryController.ts)
- [order customizer](../../frontend/src/features/orders/presentation/order-entry/OrderModifierModal.tsx)
- [cart helpers](../../frontend/src/features/orders/presentation/order-entry/orderEntryHelpers.ts)
- [dispatch API](../../frontend/src/features/orders/data/dispatch.api.ts)
- [admin product catalog API](../../frontend/src/features/admin/data/api/catalogProducts.api.ts)
- [admin modifier catalog API](../../frontend/src/features/admin/data/api/catalogModifiers.api.ts)
- [recipe BOM modal](../../frontend/src/features/admin/presentation/views/menu/RecipeBomModal.tsx)

## Target domain model

Use separate concepts with stable IDs:

```text
products
  ├── product_variants                         -- existing temperature/size combinations
  ├── product_variant_group_assignments        -- product enables Flavor group
  └── product_variant_option_assignments       -- product enables Spanish/Caramel/etc.

product_variant_groups                         -- reusable group, e.g. Flavor
  └── product_variant_options                  -- reusable option, e.g. Spanish

modifier_groups                                -- add-on selection rules
  └── product_modifiers                        -- Extra Shot, Oat Milk, Cold Foam

order_items
  ├── variant_id                               -- resolved temperature/size row
  ├── unit_price                               -- final immutable price snapshot
  └── order_item_variant_selections            -- selected flavor option and snapshots

product_variant_option_ingredients              -- additive flavor recipe deltas
```

### Proposed tables

Names may be adjusted to match project conventions, but the relationships and invariants must remain.

#### `product_variant_groups`

Reusable option groups, for example `Flavor`.

- `id UUID PRIMARY KEY`
- `code TEXT NOT NULL UNIQUE` such as `flavor`
- `name TEXT NOT NULL`
- `min_selections SMALLINT NOT NULL DEFAULT 0`
- `max_selections SMALLINT NOT NULL DEFAULT 1`
- `is_required BOOLEAN NOT NULL DEFAULT false`
- `allows_duplicates BOOLEAN NOT NULL DEFAULT false`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `created_at`, `updated_at` as `TIMESTAMPTZ`

Constraints:

- `min_selections >= 0`
- `max_selections >= min_selections`
- the initial variant-group implementation supports `max_selections = 1`
- required groups must have `min_selections >= 1`

#### `product_variant_options`

Reusable choices inside a group.

- `id UUID PRIMARY KEY`
- `group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE RESTRICT`
- `code TEXT NOT NULL`
- `name TEXT NOT NULL`
- `default_price_delta NUMERIC(10,2) NOT NULL DEFAULT 0`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- timestamps

Add a unique index on `(group_id, lower(code))` and, if business rules require labels to be unique, `(group_id, lower(name))`. Archive options instead of deleting options referenced by orders.

#### `product_variant_group_assignments`

Explicitly assigns a reusable group to a product.

- `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE RESTRICT`
- optional per-product `min_selections`, `max_selections`, `is_required`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- timestamps
- primary key `(product_id, group_id)`

Use product-level overrides only when needed. Otherwise inherit the group defaults. A Latte can have `Flavor` while another product does not.

#### `product_variant_option_assignments`

Explicitly controls which reusable options a product offers.

- `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE RESTRICT`
- `price_delta NUMERIC(10,2) NOT NULL`
- `is_default BOOLEAN NOT NULL DEFAULT false`
- `is_available BOOLEAN NOT NULL DEFAULT true`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- timestamps
- primary key `(product_id, option_id)`

The database/RPC must verify that the option's group is assigned to the same product. Add a partial unique index allowing at most one active default per `(product_id, group_id)` if defaults are supported.

#### `order_item_variant_selections`

Normalized order-line selections. This avoids using a rendered string as the source of truth and supports more than one future single-select group without adding more columns.

- `id UUID PRIMARY KEY`
- `order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE`
- `product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
- `group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE RESTRICT`
- `option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE RESTRICT`
- `group_name_snapshot TEXT NOT NULL`
- `option_name_snapshot TEXT NOT NULL`
- `price_delta_snapshot NUMERIC(10,2) NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- unique `(order_item_id, group_id)` for the initial one-of group behavior

Keep snapshot columns even though IDs are stored. Catalog names/prices must not rewrite historical receipts, KDS chits, or checks history.

#### `product_variant_option_ingredients`

Additive recipe deltas for a selected option, scoped to the product because the same reusable option can consume different quantities in different drinks.

- `id UUID PRIMARY KEY`
- `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE RESTRICT`
- `inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT`
- `amount NUMERIC(12,4) NOT NULL CHECK (amount > 0)`
- `unit TEXT NOT NULL`
- `conversion_factor NUMERIC(12,6) NOT NULL DEFAULT 1 CHECK (conversion_factor > 0)`
- timestamps
- unique `(product_id, option_id, inventory_item_id)`

Do not overload `product_ingredients.variant_id` for this additive flavor delta. Existing `variant_id` semantics are tied to the temperature/size matrix and use a fallback model. Keep those semantics stable, then add the flavor delta on top.

### Order pricing and recipe rule

For each order item:

```text
resolved base = product_variants.price when a temperature/size variant is selected
             = products.base_price otherwise

final unit price = resolved base
                + selected variant-option price deltas
                + selected add-on price deltas
```

The client may preview this value, but the database-facing dispatch operation must re-read catalog prices, validate compatibility, calculate the final value, and persist `order_items.unit_price` plus snapshots.

Recipe behavior:

1. Preserve the existing temperature/size variant-BOM behavior and repair the migration-order regression.
2. If a selected temperature/size variant has a specific BOM, use it according to the existing variant rule; otherwise use the base product BOM.
3. Add the selected flavor option's additive ingredient deltas.
4. Add selected add-on ingredient deltas by stable modifier IDs.
5. Set `is_depleted` exactly once and restore the exact same quantities on cancellation/void.

## Implementation phases

### Phase 0 — Trace dependencies and define the boundary

Before editing:

1. Read the router-targeted files and targeted migration slices only; do not read `REQUIREMENTS.md`, `mockData.ts`, or `database.types.ts` in full.
2. Trace menu load → customizer → cart merge → every dispatch caller → hydration → KDS → settlement → receipt/chit → inventory.
3. Inventory all code paths that assume `modifiers: string[]`.
4. Inventory all order item constructors and verify whether they pass `variantId`, `temperature`, and `sizeLabel`.
5. Decide whether the first seeded Latte flavor is optional (`0..1`, allowing Classic/plain Latte) or required (`1..1`). Default recommendation: optional, with an explicit Classic option only if staff need to see Classic in the ticket.
6. Do not create a second competing catalog source of truth. The new normalized tables are authoritative for flavor options; existing `product_variants` remains authoritative for current temperature/size rows.

### Phase 1 — Migration and constraints

1. Create one versioned migration under `supabase/migrations/` for the new tables, indexes, RLS, realtime publication if required by the existing sync architecture, and seed data.
2. Add the new order-item selection table and any required generated database types.
3. Add a compatibility-safe order dispatch function/RPC. It must validate:
   - product/variant compatibility;
   - option/group/product compatibility;
   - active and available state;
   - required/min/max selection rules;
   - duplicate rules;
   - server-authoritative price;
   - no client-supplied selection for a different product.
4. Add composite integrity protection for existing `order_items.variant_id` so a variant for Product A cannot be posted with Product B. Prefer a composite foreign key or an equivalent RPC/trigger check.
5. Repair the final definition of `fn_deplete_inventory_on_item_ready()` in a later migration so it handles both existing product variants and new option ingredients. The final migration state, not an earlier migration, is what must be tested.
6. Keep foreign-key behavior historical-order-safe. Archive catalog options and variants rather than deleting them. Replace delete-and-reinsert variant upserts with stable-ID update/insert plus archive of removed rows.
7. Add indexes for foreign keys and the actual menu queries. Do not add speculative indexes without a query predicate or ordering requirement.

### Phase 2 — Security and RLS

1. Establish the project’s real role mapping for operational staff, admin, and anonymous/public access.
2. Enable RLS on each new exposed table.
3. Allow operational roles to read active menu configuration required for ordering.
4. Restrict catalog writes to admin/manager authorization.
5. Restrict historical order selection reads to roles already allowed to read the associated order/check.
6. If using `SECURITY DEFINER`, set `search_path = ''`, fully qualify every relation, check the caller inside the function, and revoke broad `EXECUTE` before granting only required roles. Prefer `SECURITY INVOKER` when existing policies can support it.
7. Add pgTAP/RLS tests for `anon`, `authenticated`, operational staff, and admin behavior.

### Phase 3 — Admin catalog and recipe UI

1. Extend admin types with group, option, assignment, and option-ingredient models.
2. Add a dedicated `Flavor / Single Choice` editor to the product modal. Do not make flavor look like a flat add-on checkbox list.
3. Allow admins to:
   - assign the reusable Flavor group to a product;
   - choose which options are available for that product;
   - set per-product price deltas and ordering;
   - mark an optional default only when business rules require it;
   - archive an option without deleting history.
4. Update the modifier-group UI so existing add-ons expose and enforce their group rules. At minimum, show `Choose one`, `Choose up to N`, and required/optional state.
5. Add option-specific recipe editing. A Spanish Latte can add condensed milk, while Vanilla can add vanilla syrup. Show base BOM, temperature/size BOM, and flavor delta scope clearly.
6. Save related catalog rows transactionally through the catalog API/RPC. Avoid partial writes where the product says a group is enabled but its options were not saved.

### Phase 4 — Menu hydration and order entry

1. Extend `menuApi.getMenuItems()` and `mapRawProductToMenuItem()` to load active flavor groups/options and assignments.
2. Preserve current temperature/size matrix loading and availability filtering.
3. Replace single `selectedModifiers: string[]` state with explicit selected IDs by group, while retaining a compatibility display projection for old callers.
4. Render:
   - radio-style controls for Flavor (`max = 1`);
   - checkbox/toggle controls for multi-select add-ons;
   - quantity controls only when duplicate selection is explicitly enabled;
   - min/max validation and clear required-state messaging.
5. Resolve the selected temperature/size row and selected flavor option before adding to cart.
6. Format the line label from stable selection data, for example `Latte (Spanish · Iced · 12oz)`, with add-ons shown separately.
7. Update cart equality to use:

   ```text
   product ID
   + temperature/size variant ID
   + normalized selected variant-option IDs by group
   + normalized selected modifier IDs/quantities
   + notes
   ```

   Different flavors must never merge. Identical selections may merge.

### Phase 5 — Dispatch, persistence, and hydration

1. Extend the shared dispatch input with normalized selected variant options and modifier IDs.
2. Update all callers, not only `dispatch.api.ts`:
   - `tableTab.slice.ts` for dine-in;
   - `takeoutOrderActions.ts`;
   - `onlineDeliveryOrderActions.ts`;
   - any shared tab/round workflow that constructs order items.
3. Prefer one atomic RPC for order + items + selections, or make the current sequence transactional. Do not allow an order item to exist without its required selections.
4. Remove or tightly gate the current silent fallback that retries an insert without variant columns. Schema drift must surface as an actionable error, not silently discard selections.
5. Persist final `unit_price`, `variant_id`, variant display snapshots, selected option IDs, selected option snapshots, modifier IDs, and compatibility modifier display data.
6. Update hydration queries/mappers to load all variant and selection fields. A refresh must not turn `Spanish Latte` back into an unlabeled `Latte`.
7. Update table transfers, split tabs, takeout append-round flows, and item void/transfer operations to preserve selections.

### Phase 6 — KDS, receipts, checks, and settlement

1. Update KDS ticket mapping/cards to show the selected flavor separately from size/temperature and add-ons.
2. Update runner chits and thermal receipt payloads to use snapshots/joins from the database, not only the local `productName` string.
3. Keep the existing 48-column wrapping and 80mm receipt layout. Ensure long names such as `Latte — Spanish · Iced · 12oz` wrap without hiding add-ons or notes.
4. Update checks history and settlement read models to select flavor and add-on selections.
5. Preserve historical `unit_price`, option name, and price delta after catalog edits.
6. Verify senior/PWD, VAT, service charge, comp, void, and settlement calculations continue to use the final line price and do not treat flavor selection as a separate tax category.

### Phase 7 — Inventory depletion and restoral

1. Consolidate the final `fn_deplete_inventory_on_item_ready()` implementation after all existing migration overrides are considered.
2. Lock inventory rows in a deterministic order and keep depletion atomic.
3. Deplete:
   - base or resolved temperature/size BOM;
   - selected flavor option ingredients;
   - selected modifier ingredients.
4. Never use option names or price-suffixed display strings as the primary inventory lookup.
5. Preserve non-blocking negative-stock behavior and soft alerts from the existing system.
6. Ensure repeated READY/SERVED updates do not double-deplete.
7. Ensure cancellation/void/restoral reverses the exact selected quantities, including flavor option ingredients.
8. Add tests for a Spanish Latte and Vanilla Latte with different ingredient deltas.

### Phase 8 — Seed, backfill, rollout, and cleanup

1. Seed a reusable `Flavor` group and options: `Classic`, `Spanish`, `Caramel`, `Vanilla`.
2. Assign the group explicitly to Latte only at first.
3. Add realistic price deltas and ingredient mappings from actual venue recipes; do not guess recipe quantities in production.
4. Add a fixture covering:
   - plain/classic Latte;
   - Spanish Latte;
   - Caramel Latte;
   - Vanilla Latte;
   - hot/cold and at least two sizes;
   - two valid add-ons;
   - invalid two-flavor selection.
5. Backfill only data that can be determined safely. Preserve existing order history and do not rewrite historical product names or prices.
6. Deploy migrations locally with `supabase db reset`, run database/RLS tests, then validate against staging-shaped data before remote deployment.
7. Run a dual-read/dual-write compatibility period only if needed. Document which path is authoritative and remove compatibility code in a separate cleanup change.

## Testing matrix

### Database and RPC

- optional Flavor accepts zero or one option;
- required Flavor rejects zero;
- Flavor rejects two options;
- add-on groups accept multiple options within `max_selections`;
- add-on groups reject selections above the configured maximum;
- unavailable/archived options cannot be newly ordered;
- an option from another product/group is rejected;
- a product/variant mismatch is rejected;
- a variant cannot contain duplicate values from one dimension;
- client-supplied price is ignored or rejected when it differs from catalog truth;
- order-line price remains unchanged after catalog edits;
- stable option IDs and snapshots survive option rename/archive;
- variant-specific BOM and base fallback behave as specified;
- flavor ingredient delta depletes once;
- repeated readiness updates do not double-deplete;
- cancellation/restoral restores the exact quantity;
- unauthorized catalog writes fail RLS/RPC authorization tests.

### Frontend and workflow

- tapping Latte opens the flavor/temperature/size/add-on customizer;
- selecting Spanish clears/replaces another flavor instead of adding a second flavor;
- multiple permitted add-ons can be selected;
- required groups block confirmation with an actionable message;
- price preview equals server-validated price;
- different flavor selections produce separate cart lines;
- identical selections merge quantities;
- dine-in, takeout, delivery, and appended rounds retain selections;
- refresh/hydration retains flavor, size, temperature, add-ons, and price;
- KDS, runner, receipt, checks history, and settlement display the same selection;
- void, transfer, split, senior/PWD partial settlement, and cancellation preserve selection data.

### Performance and operations

- menu query remains bounded and uses the intended foreign-key/composite indexes;
- no N+1 query per option or per cart line;
- realtime catalog updates do not leave an open customizer with silently stale pricing;
- migration reset and staging deployment succeed;
- generated database types are updated and compile cleanly.

## Acceptance criteria

The feature is complete only when:

1. Staff can order `Latte → Spanish` and cannot also select `Caramel` from that same Flavor group.
2. Staff can select multiple permitted add-ons independently.
3. Flavor combines correctly with Hot/Iced and cup size.
4. Invalid selections are rejected server-side even if the client is bypassed.
5. The server calculates and snapshots the authoritative final price.
6. Cart merge behavior distinguishes flavor, temperature, size, add-ons, notes, and quantity.
7. Dine-in, takeout, delivery, KDS, runner chits, receipts, checks history, and settlement retain the selection.
8. Inventory depletion uses the correct base/variant BOM plus flavor/add-on deltas and never double-depletes.
9. Historical orders remain readable after catalog rename/archive or price changes.
10. New schema and RPCs have least-privilege RLS/grants and tests.
11. Existing temperature/size variants and add-ons continue to work.
12. No second competing catalog source of truth or free-text variant field is introduced.

## Research and source notes

The background research is recorded in [docs/research/menu-product-variants.md](../../docs/research/menu-product-variants.md). It compares official Shopify, Square, and Toast catalog/selection models and cites PostgreSQL and Supabase guidance.

Primary references used by this plan:

- [Shopify — Product variants](https://shopify.dev/docs/storefronts/themes/product-merchandising/variants)
- [Square — CatalogItem](https://developer.squareup.com/reference/square/objects/CatalogItem)
- [Toast — Modifier selection limits](https://doc.toasttab.com/doc/devguide/apiUsingMenusApiDataToSubmitProperlyFormedOrders_V2.html)
- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL — CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase — Local database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase — Testing RLS with pgTAP](https://supabase.com/docs/guides/database/postgres/testing-row-level-security)

## Supabase/Postgres rules carried into this plan

- Use versioned migrations; validate with local reset before deployment.
- Use foreign keys, named checks, unique constraints/indexes, and composite indexes for database-local invariants.
- Do not use a `CHECK` constraint for a cross-table rule it cannot evaluate.
- Index foreign keys and actual high-frequency query paths, not every column by default.
- Prefer `SECURITY INVOKER`; if `SECURITY DEFINER` is required, pin `search_path = ''`, schema-qualify relations, validate the caller, and restrict `EXECUTE`.
- Keep catalog and order writes atomic where multiple related rows are required.
- Use stable IDs for joins and immutable snapshots for historical display and pricing.
- Archive options/variants instead of deleting rows referenced by historical orders.
