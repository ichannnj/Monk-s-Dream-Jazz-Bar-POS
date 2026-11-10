# Menu Product Variants and Mutually-Exclusive Options

> Research note and implementation plan for Monk's Dream Jazz Bar POS
>
> Status: research complete; application code intentionally not changed.
>
> Scope: model a menu item such as `Latte` with mutually-exclusive choices such as `Spanish`, `Caramel`, `Vanilla`, while preserving multi-select add-ons such as `Extra Shot` or `Cold Foam`.

## 1. Executive recommendation

Do not add one free-text `variant` column to `products` or `order_items`. That would make the database unable to prove that a selected value belongs to the product, that only one value was selected, that the price is authoritative, or that the selected recipe is the one depleted from inventory.

Use two related but distinct concepts:

1. **Sellable product variant** — a specific sellable combination of product options with an authoritative price, availability, optional SKU, and optional variant-specific BOM. Example: `Latte / Hot / 12oz / Spanish`.
2. **Selection group** — a group of choices with explicit cardinality and pricing behavior. The same model supports both a single choice and add-ons:
   - `Flavor`: `min = 0`, `max = 1` for an optional one-of choice, or `min = 1`, `max = 1` when required.
   - `Add-ons`: `min = 0`, `max = N` for optional multi-select add-ons.
   - `Milk choice`: usually `min = 0`, `max = 1`; it is one choice even if it is not promoted to a sellable SKU.

For the current codebase, the implementation should be staged:

- **Short-term compatible path:** use the existing `modifier_groups` and `product_modifiers` tables for a `Latte Flavor` group with `max_selections = 1`. Store selected option IDs and group IDs, not only option names. This immediately gives the POS one-of behavior without inventing another unconstrained column.
- **Recommended durable path:** keep `product_variants` for exact sellable combinations and normalize option dimensions/values through join tables. Use this path whenever flavor changes the exact price, SKU, availability, or recipe/BOM. It avoids adding future columns such as `flavor`, `sweetness`, `milk_type`, and `temperature` directly to `product_variants`.
- **Do not conflate the two:** a single-select modifier group is not automatically a product variant. Promote a choice to the variant matrix when it defines the sellable item identity or recipe rather than merely adding an optional adjustment.

### Latte example

```text
Product: Latte
  Variant dimensions (when they define the sellable item):
    Temperature: Hot | Iced
    Size: 8oz | 12oz | 16oz
    Flavor: Classic | Spanish | Caramel | Vanilla

  Modifier groups (customizations on the selected sellable item):
    Milk choice: Whole | Oat | Soy       (0..1)
    Extra shots: Extra shot              (0..3, duplicates only if explicitly allowed)
    Toppings: Cold foam | Cinnamon       (0..N)
```

If Spanish, Caramel, and Vanilla have their own syrup quantities, prices, or availability, they should be represented in the variant/option-value/BOM model or in a single-select modifier group with inventory-backed option rows. The deciding test is whether the choice changes the sellable identity and authoritative recipe—not whether the UI renders radio buttons or checkboxes.

## 2. Research findings from primary sources

### 2.1 Variants represent a concrete option combination

[Shopify's official variant documentation](https://shopify.dev/docs/storefronts/themes/product-merchandising/variants) describes a product variant as a combination of product options and says that the selected variant controls product information such as price and media. It recommends presenting multiple product options as separate selectors and updating the selected variant as the option combination changes.

This supports the following POS rule: `Temperature`, `Size`, and `Flavor` may be separate option dimensions in the UI, but the cart/order should resolve them to one concrete sellable variant before dispatch. The order line should retain that resolved variant ID and a historical price snapshot.

[Shopify's ProductVariant reference](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant) likewise defines a variant as a specific version of a product differentiated by options such as size or color. This is a useful vocabulary boundary even though Monk's Dream is not implementing Shopify.

### 2.2 Catalog items and modifier lists are separate concepts

[Square's official CatalogItem reference](https://developer.squareup.com/reference/square/objects/CatalogItem) models item `variations` separately from `modifier_list_info`. It also describes `item_options` as groups used to manage and order item variations, and says an item must have at least one variation. The same object separately attaches modifier lists to an item and allows item-specific modifier limits.

The practical implication is to keep the price/SKU/availability identity of a Latte variant separate from optional or configurable additions. A single-select group is still a selection rule; it does not require a new column on the base product.

### 2.3 Selection cardinality is a first-class catalog rule

[Toast's official modifier-group documentation](https://support.toasttab.com/en/article/Setting-up-limited-and-free-modifiers-for-an-item?lang=en_US) exposes multi-select behavior, minimum selections, maximum selections, and duplicate-selection behavior as separate settings. Its examples support both one-of and many-of groups.

[Toast's official ordering API guidance](https://doc.toasttab.com/doc/devguide/apiUsingMenusApiDataToSubmitProperlyFormedOrders_V2.html) says the ordering integration must enforce `minSelections`, `maxSelections`, required behavior, and `isMultiSelect`; the API rejects an order that violates those rules. This is the strongest direct support for validating the rule at the order boundary instead of trusting only a UI toggle.

[Toast's official modifier-group guide](https://doc.toasttab.com/doc/platformguide/platformWorkingWithModifierGroupsMenuManager.html) gives the exact patterns relevant here:

- optional one selection: minimum `0`, maximum `1`;
- required one selection: minimum `1`, maximum `1`;
- optional multiple selections: minimum `0`, maximum `N` or no maximum;
- duplicate choices only when explicitly enabled.

Therefore, the data model should not rely on a boolean named `is_addon` or `is_variant`. The core rule is a selection group's cardinality, plus whether the selected value is a concrete sellable variant or an adjustment to one.

### 2.4 PostgreSQL constraints should express local invariants

[PostgreSQL's constraints documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) recommends using `UNIQUE`, `EXCLUDE`, and foreign keys for cross-row or cross-table restrictions where possible. It also documents that a unique combination is enforced by a unique constraint/index, and that a partial unique index is appropriate when uniqueness applies only to a subset of rows.

[PostgreSQL's `CREATE INDEX` documentation](https://www.postgresql.org/docs/current/sql-createindex.html) confirms that partial indexes can enforce uniqueness over a subset and that composite/expression indexes are available. This supports:

- unique option value slugs/names within a group;
- unique variant combinations;
- unique `(product_id, group_id, sort_order)` or equivalent ordering keys where needed;
- partial uniqueness for one active/default row if the business rule requires it;
- indexes on every foreign-key and high-selectivity catalog lookup path.

PostgreSQL does not let a normal `CHECK` constraint query other rows or other tables. The same documentation warns that `CHECK` expressions are assumed immutable and should not be used to encode cross-row validation. Thus, “all selected values belong to this product” and “exactly one value from each single-select group” must be enforced through foreign keys, denormalized keys plus unique constraints, an RPC/transaction, or a carefully scoped trigger—not by a cross-table `CHECK`.

### 2.5 Supabase security and migration requirements

[Supabase's Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security) says every table in an exposed schema should have RLS, and that grants and policies are separate controls. Adding a policy does not remove broad grants. This is important because the current migrations contain broad internal-POS `FOR ALL` policies; the implementation agent must not copy that pattern to new catalog tables without reconciling the actual staff/admin authorization model.

[Supabase's database-functions guide](https://supabase.com/docs/guides/database/functions) documents calling Postgres functions through `rpc()`. It recommends `security invoker` by default. If `security definer` is required, Supabase requires a pinned `search_path`, schema-qualified relations, explicit ownership/authorization checks, and narrowed `EXECUTE` grants. A catalog upsert/validation RPC should follow these rules and must never trust a client-supplied unit price.

[Supabase's migration guide](https://supabase.com/docs/guides/deployment/database-migrations) says schema changes belong in versioned migration files, should be tested with a local reset, and should not be made directly on the remote database. Migration ordering and remote migration history must stay synchronized.

[Supabase's RLS testing guide](https://supabase.com/docs/guides/database/postgres/testing-row-level-security) recommends one test file per RLS-protected table, explicit allow/deny assertions through `anon` and `authenticated`, and running `supabase test db`.

## 3. Current repository findings

The plan must account for these existing structures rather than creating an unrelated second catalog system:

| Existing area                | Current shape                                                                                                                 | Consequence for this plan                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public.product_variants`    | Existing rows are keyed by `product_id`, `temperature`, `size_label`, with `price`, `sku`, availability, and ordering fields. | This is already the sellable-variant direction, but it is hard-coded to temperature and size. Avoid adding more one-off dimension columns for flavor.              |
| `public.order_items`         | Has `variant_id`, `temperature`, `size_label`, `unit_price`, and `modifiers JSONB`.                                           | Keep `variant_id` as the authoritative resolved variant link; retain snapshots for historical printing/read models. Replace name-only modifier payloads gradually. |
| `public.product_ingredients` | Supports `variant_id` and a base-BOM fallback.                                                                                | Variant resolution must happen before readiness/depletion, and variant-specific BOM selection must remain deterministic.                                           |
| `public.modifier_groups`     | Has `min_selections`, `max_selections`, `is_required`, reusable/global groups, and category scoping.                          | It already has most of the one-of/many-of vocabulary. Add explicit duplicate/default semantics only if needed; do not create a parallel “add-on groups” table.     |
| `public.product_modifiers`   | Links options to groups and can carry price/inventory deltas; some rows are reusable templates with `product_id IS NULL`.     | A single-select Latte Flavor group can be introduced compatibly here when the choice is not a separate SKU. Use stable option IDs in order data.                   |
| `order_items.modifiers`      | JSONB array normalization trigger exists because clients previously wrote double-encoded strings.                             | A new implementation must preserve array normalization during transition and should not make JSON text parsing the source of truth for validation.                 |
| Catalog RLS                  | Existing migrations include broad `FOR ALL ... USING (true)` internal-POS policies.                                           | The agent must document and test the chosen staff/admin policy boundary; new catalog writes should not silently become public writes.                              |

Relevant local references: [current variant migration](../../supabase/migrations/20261107000003_product_variants_and_matrix_pricing.sql), [current modifier/group migration](../../supabase/migrations/20261030000001_admin_catalog_and_inventory_expansion.sql), [modifier catalog seeding](../../supabase/migrations/20261108000007_product_modifiers_catalog_and_seeding.sql), and [order-item modifier normalizer](../../supabase/migrations/20261108000010_normalize_order_item_modifiers.sql).

## 4. Target domain model

### 4.1 Semantic definitions

The implementing agent should record these definitions in code comments/types and use them consistently:

- **Product:** the menu concept shown to staff, such as `Latte`.
- **Option group/dimension:** a named axis or choice set, such as `Temperature`, `Size`, or `Flavor`.
- **Option value:** one allowed value inside a group, such as `Hot` or `Spanish`.
- **Variant:** one sellable combination of option values with one authoritative price and optional SKU/BOM.
- **Modifier group:** a selection rule applied to a selected product/variant, normally used for optional customizations.
- **Modifier option:** one selectable modifier value with an optional price delta and inventory delta.
- **Order-line snapshot:** immutable values copied at order creation/dispatch so later catalog edits do not rewrite historical receipts or KDS tickets.

### 4.2 Recommended normalized catalog shape

The exact table names may be adapted to the existing schema, but the implementing agent should preserve these relationships:

```text
products
  └── product_option_groups       -- Flavor, Size, Temperature
        └── product_option_values -- Spanish, 12oz, Hot

products
  └── product_variants             -- exact sellable combinations
        └── product_variant_values -- one value per variant per dimension

products / reusable scope
  └── modifier_groups              -- e.g. Extra toppings, Milk choice
        └── product_modifiers      -- selectable options and price/inventory deltas

order_items
  ├── variant_id                   -- resolved sellable combination
  ├── unit_price                   -- authoritative snapshot at order time
  └── order_item_selections        -- normalized selected modifier/option IDs, phased in
```

There are two acceptable implementation variants:

**Preferred long-term design:** introduce dedicated product option group/value tables and a `product_variant_option_values` join table. This makes variant combinations extensible beyond the current `temperature` and `size_label` columns.

**Lower-risk incremental design:** retain `modifier_groups`/`product_modifiers` for all one-of and many-of selection rules, introduce a single-select `Flavor` group for Latte, and use the existing `product_variants` only when the selected flavor is part of an exact price/BOM/SKU combination. This is smaller, but it leaves the variant matrix partially dimension-specific until a later normalization phase.

Do not implement both designs as competing sources of truth. If the incremental design is selected, the plan must include a later consolidation milestone and a clear read/write precedence.

### 4.3 Cardinality invariants

At minimum, enforce the following invariants in the database-facing workflow:

1. `min_selections >= 0`.
2. `max_selections IS NULL OR max_selections >= min_selections`.
3. A required group has `min_selections >= 1`.
4. A single-select group has `max_selections = 1` and duplicate selections disabled.
5. A multi-select group has `max_selections > 1` or an explicitly unlimited maximum.
6. A selected option belongs to the group attached to the product/variant being ordered.
7. A required group is satisfied before order dispatch.
8. A selection count is evaluated per order-item line, not across the whole tab/order.
9. A variant cannot contain two values from the same option dimension.
10. A variant option value and its parent product resolve to the same product.
11. The client cannot choose a variant ID for one product while posting a different product ID.
12. A price is read from the authoritative catalog at validation time and snapshotted into `order_items.unit_price`.
13. Historical order lines remain printable if the catalog option is later renamed, disabled, or deleted; use `ON DELETE RESTRICT` or immutable snapshots where appropriate.

## 5. Detailed implementation plan for another AI agent

### Phase 0 — Establish the boundary before editing

1. Read the existing migrations and feature router files named in `AGENTS.md`; do not read large files wholesale.
2. Trace the complete catalog-to-order path:
   - menu hydration/mapping;
   - admin catalog and recipe screens;
   - order-entry controller and modifier modal;
   - order cart line identity and merge behavior;
   - dispatch RPC/API;
   - KDS hydration/rendering;
   - settlement/read-model RPCs;
   - receipt/chit formatting;
   - inventory depletion.
3. Produce a short dependency map before changing schema. The implementation must identify every place that currently assumes modifiers are `string[]` and every place that assumes variants are only temperature/size.
4. Decide per Latte choice whether it is:
   - a variant option because it changes sellable identity/price/BOM/availability; or
   - a single-select modifier because it is an optional customization with a price/inventory delta.
5. Use a stable identifier as the source of truth. Names are display labels only.

### Phase 1 — Database design and migration

If using the preferred long-term design:

1. Add product option groups and option values with UUID primary keys, `product_id` or a clearly defined reusable scope, display name, stable slug/code, active/available flag, sort order, and timestamps.
2. Add explicit cardinality fields to the selection group model: `min_selections`, nullable `max_selections`, `is_required` or derive requiredness from minimum, and `allows_duplicates` where duplicate selection is meaningful.
3. Extend the existing variant model with a join table between variants and option values. Do not add `flavor`, `sweetness`, `milk_type`, or similar columns one by one.
4. Add a unique rule preventing duplicate option values in a group and duplicate option-dimension values in a variant. Where a simple unique constraint cannot express the rule, use a denormalized `option_group_id` on the join row plus a unique index, or validate atomically in a restricted RPC/trigger.
5. Add and verify indexes for every foreign key and common catalog query. At minimum cover product-to-groups, group-to-values, product-to-variants, variant-to-option-values, product-to-modifiers, and group-to-modifiers. Add a composite index matching the actual menu query predicates, with equality columns before range/order columns.
6. Use `TEXT` for labels/slugs unless a real length constraint is part of the business rule, `NUMERIC(10,2)` for money, `BOOLEAN` for flags, and `TIMESTAMPTZ` for timestamps.
7. Use named constraints and idempotent migration patterns. PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`; if a later migration must add a constraint, guard it with a `DO` block or use a safe unique-index strategy.
8. Keep existing `temperature`, `size_label`, and `variant_id` columns during the migration. Add compatibility reads/writes first, then remove legacy columns only after all consumers are migrated and historical data is verified.

If using the lower-risk incremental design:

1. Add a Latte `Flavor` group to the existing group model.
2. Set `min_selections = 0`, `max_selections = 1` when plain Latte is valid, or `min = 1`, `max = 1` if flavor is mandatory.
3. Add `Classic`, `Spanish`, `Caramel`, and `Vanilla` as stable option rows. Mark the default explicitly if the UI should preselect `Classic`.
4. Add option-level `price_delta` and inventory/BOM linkage only when the choice is not represented as a concrete variant price/BOM.
5. Add an order-line selection representation that carries `group_id`, `option_id`, quantity, price delta snapshot, and display-name snapshot. Keep the old JSONB array as a compatibility projection during rollout.

In either design, do not silently use `product_modifiers.name` matching as the durable join key. The existing depletion function currently resolves selected modifiers by text; the implementing agent must change the new path to use IDs and preserve a name snapshot only for display.

### Phase 2 — Security, grants, and RPC boundary

1. Define access rules before writing policies:
   - operational staff can read active menu groups, option values, variants, and modifiers needed for ordering;
   - admins/managers can create, edit, archive, and reorder catalog configuration;
   - historical order selections are readable wherever the associated order/check is readable;
   - anonymous/public access is allowed only if the product catalog is intentionally public.
2. Enable RLS on each new exposed table and set grants separately. Do not assume `USING (true)` is safe merely because tablets are internal.
3. Add one RLS test file per protected table. Test both permitted and denied operations through the actual Supabase roles.
4. Implement one atomic database-facing operation for catalog writes if multiple rows must be changed together (group + values, or variant + option values). Prefer `SECURITY INVOKER` and existing role checks. If `SECURITY DEFINER` is unavoidable, put it in a non-exposed/private schema, set `search_path = ''`, schema-qualify every relation, explicitly verify the caller's admin role, and revoke broad `EXECUTE` grants.
5. Implement order-line validation in the dispatch/insert RPC, not only in React:
   - confirm the product, variant, and option IDs are compatible;
   - confirm availability;
   - confirm required and min/max cardinality;
   - reject duplicate values unless allowed;
   - calculate the price server-side;
   - write the immutable snapshot used by KDS, settlement, and printing.
6. Keep the transaction short. Do not call external services while holding catalog/order locks.

### Phase 3 — Catalog/admin workflow

1. Add an admin editor that distinguishes:
   - **Variant dimensions/options:** values that contribute to a sellable combination;
   - **Modifier groups:** optional/required choices applied after the sellable item is selected.
2. Display cardinality in human language: `Choose one`, `Choose up to 3`, `Choose any`, or `Required`.
3. For a single-select group, render radio-style controls and prevent a second selection in the client. Still validate on dispatch.
4. For a multi-select group, render checkbox/toggle controls, quantity controls only when duplicates are allowed, and a live count against min/max.
5. Require an explicit default only when the business rule requires one. Do not auto-select an option merely because it is first in sort order.
6. Provide archive/unavailable behavior rather than deleting options that appear in historical orders.
7. When a variant has a specific BOM, make it visible in the recipe editor and preserve the existing base-BOM fallback rule. Add validation preventing a variant from being sold when a required recipe/ingredient mapping is missing if that is the venue's operational rule.

### Phase 4 — Order-entry and cart identity

1. Load option groups/values in the menu hydration query without breaking the existing fallback query path.
2. Make the selection modal resolve a concrete variant before adding a cart line when variant dimensions are in use.
3. Represent cart-line identity as:

   ```text
   product_id + variant_id + normalized selected modifier option IDs + notes
   ```

   Two lines with different flavor, size, temperature, or modifier selections must not merge merely because their base product is the same.

4. Calculate the display price from the resolved variant price plus validated modifier deltas. Never sum arbitrary client-provided labels.
5. Preserve stable IDs in the local cart and send them to the dispatch API. Keep display labels for receipts and offline UI only.
6. If a catalog change arrives through realtime while a modal is open, revalidate the selection on send and show an actionable unavailable/changed-price result rather than silently dispatching stale data.

### Phase 5 — Dispatch, KDS, settlement, and printing

1. Update dispatch payloads and the atomic dispatch RPC to carry:
   - `variant_id`;
   - selected option/modifier IDs grouped by group;
   - price snapshots;
   - display snapshots for name, flavor, size, and temperature.
2. Ensure station routing and prep notes remain independent from variant cardinality.
3. Update KDS cards to show the resolved variant descriptor, for example `Latte — Spanish · Iced · 12oz`, and show add-ons separately, for example `+ Extra Shot`.
4. Update settlement/read-model RPCs to join variant and selection data without changing historical prices. If the normalized selection tables are not yet live, read from the compatibility projection with deterministic parsing.
5. Update ESC/POS and receipt/chit output so the variant descriptor and modifier lines are distinct and fit the existing 48-column wrapping rules.
6. Update inventory depletion to use the resolved variant BOM first, then the base BOM only under the existing fallback rule. Deplete modifier ingredients by stable option/modifier IDs, not by matching display text.
7. Ensure void/cancel/restoral paths reverse the exact variant and modifier quantities that were depleted.

### Phase 6 — Backfill, rollout, and cleanup

1. Backfill existing temperature/size variants into the normalized option-group/value model if that design was chosen.
2. Backfill existing modifier rows with stable group membership and, where possible, stable IDs in order-item projections.
3. Seed a small Latte fixture set:
   - plain/classic Latte;
   - Spanish Latte;
   - Caramel Latte;
   - Vanilla Latte;
   - at least one hot/cold and size combination;
   - one add-on combination with two permitted add-ons;
   - one invalid two-flavor combination.
4. Run dual-read/dual-write compatibility only long enough to validate production-shaped data. Record which path is authoritative.
5. After all consumers are migrated and historical receipts are verified, remove or deprecate legacy dimension columns and name-only modifier parsing in a separate migration. Do not bundle destructive cleanup with the initial rollout.

## 6. Database test plan

The implementing agent should add database tests before declaring the feature complete. At minimum:

### Cardinality and catalog integrity

- required one-of group rejects zero selections;
- one-of group rejects two different options;
- optional one-of group accepts zero or one option;
- multi-select group accepts two options within its maximum;
- multi-select group rejects more than its maximum;
- duplicate option is rejected unless `allows_duplicates` is true;
- invalid `min > max` configuration is rejected;
- an option from another product/group is rejected;
- a variant cannot contain two values from one dimension;
- duplicate variant combinations are rejected;
- unavailable/archived variant cannot be dispatched.

### Pricing and historical data

- variant price is authoritative over base price when a variant is selected;
- modifier delta is applied only to the selected modifier option;
- a client-supplied price mismatch is rejected or ignored in favor of the server value;
- order-line unit price remains unchanged after catalog price edits;
- renamed or archived catalog values do not erase historical receipt text.

### Inventory and operations

- variant BOM is used when present;
- base BOM fallback is used only when the variant has no variant-specific BOM;
- selected flavor/modifier ingredient delta is depleted once at READY/SERVED;
- repeated status updates do not double-deplete;
- cancellation/restoral returns the exact selected ingredient quantities;
- KDS and print payloads contain variant descriptor plus separate modifier lines.

### RLS and RPC security

- authorized staff can read active catalog data;
- unauthorized roles cannot write catalog configuration;
- admin-only catalog mutations reject non-admin callers;
- historical order selections follow order/check visibility;
- `SECURITY DEFINER` functions, if any, reject unauthorized callers and have restricted execute grants;
- tests run through `anon` and `authenticated` rather than only inspecting `pg_policies`.

Use the project's Supabase test workflow, including `supabase db reset` for migration validation and `supabase test db` for pgTAP/RLS tests. Use explain plans only for real catalog queries after representative data exists; do not add indexes speculatively without matching query predicates.

## 7. Acceptance criteria

The feature is ready only when all of the following are true:

1. A cashier/waiter can order `Latte → Spanish` and cannot also select `Caramel` from the same one-of group.
2. The same Latte can accept multiple add-ons from a separate multi-select group where the configured maximum permits them.
3. The cart creates separate lines for different flavors or add-on combinations and merges only truly identical lines.
4. Dispatch rejects invalid selections even if the client is bypassed.
5. The server resolves and snapshots the authoritative price.
6. KDS, runner chits, receipts, check history, settlement, and inventory depletion all show/use the same resolved selection.
7. Variant-specific BOM and base-BOM fallback behavior are deterministic and tested.
8. Catalog edits do not rewrite historical orders.
9. New tables and RPCs have least-privilege grants, appropriate RLS, and tests.
10. The change is delivered through versioned migrations, tested locally, and does not introduce a second competing source of truth.

## 8. Decisions intentionally assumed by this plan

These defaults keep the implementation moving without hiding important business rules:

- Plain/classic Latte is a valid default, so `Flavor` is optional (`0..1`) unless the venue explicitly requires every Latte to name a flavor.
- Spanish, Caramel, and Vanilla are mutually exclusive within one Latte flavor group.
- Extra shots, toppings, and similar add-ons remain separate multi-select groups.
- If flavor changes recipe quantities or exact selling price, the long-term model treats it as part of the sellable variant combination or as a stable-ID single-select option with an equivalent inventory/BOM rule.
- Existing historical order rows are preserved; no destructive rewrite is part of the first migration.
- The implementing agent must confirm the final product/variant/modifier classification from the actual menu and recipe data before seeding every item.

## Sources

- [Shopify — Support product variants](https://shopify.dev/docs/storefronts/themes/product-merchandising/variants)
- [Shopify — ProductVariant Storefront API object](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant)
- [Square — CatalogItem object](https://developer.squareup.com/reference/square/objects/CatalogItem)
- [Square — Catalog API](https://developer.squareup.com/reference/square/catalog-api)
- [Toast — Set up and use modifier multi-select](https://support.toasttab.com/en/article/Setting-up-limited-and-free-modifiers-for-an-item?lang=en_US)
- [Toast — Using menus API data to submit properly formed orders](https://doc.toasttab.com/doc/devguide/apiUsingMenusApiDataToSubmitProperlyFormedOrders_V2.html)
- [Toast — Working with modifier groups](https://doc.toasttab.com/doc/platformguide/platformWorkingWithModifierGroupsMenuManager.html)
- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL — CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase — Deploy database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase — Test Row Level Security policies with pgTAP](https://supabase.com/docs/guides/database/postgres/testing-row-level-security)
