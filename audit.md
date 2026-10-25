# Repository Structure and Code Splitting Audit

**Date:** 2026-10-20  
**Scope:** File tree, feature ownership, folder nesting, naming, redundant entrypoints, justified source extraction, and separation of presentation, application workflows, business rules, and data/integration adapters. Application source, packages, database layout, scripts, and documentation locations were inventoried. No implementation changes were made.

The main structural problem is that frontend features span global technical layers. Feature folders exist for some UI, but their state, persistence, contracts, and fixtures live elsewhere. Renaming suffixes alone would leave that problem intact.

**Architecture constraint:** Keep the current runtime architecture. Presentation, Application, Domain, and Data are folder responsibilities within features. Preserve Zustand store composition, direct API calls, Supabase RPCs, realtime lifecycle, optimistic updates, offline replay behavior, and role-based navigation. Moves, renames, import updates, and justified cohesive extractions are in scope; new repository interfaces, dependency inversion, dependency injection, or redesigned workflows are not required.

This audit applies the user's current requirements: feature-first organization, folder-based technical roles, and splitting files over 350 lines only when meaningful responsibilities can move elsewhere. These requirements supersede the older layer-first examples and unconditional size ceiling in repository documentation. `.slice.ts`, `.api.ts`, and `.types.ts` are naming-policy mismatches here; their extensions are not inherently defects in TypeScript or Zustand.

## Overall Score

Counts represent findings below, not individual files. Structural findings are warnings; this review does not establish runtime failures.

| Category                       | ERRORs | WARNINGs |
| ------------------------------ | -----: | -------: |
| Feature ownership              |      0 |        2 |
| Folder nesting and entrypoints |      0 |        2 |
| Build artifact placement       |      0 |        1 |
| Architecture documentation     |      0 |        1 |
| Module responsibility          |      0 |        1 |
| Separation of concerns         |      0 |        1 |
| **Total**                      |  **0** |    **8** |

Security, data integrity, runtime performance, error handling, and N+1 behavior were outside the requested scope and were not graded.

## CRITICAL

No findings within this scope.

## HIGH

### 1. Features are spread across global technical layers

**Severity:** WARNING — Feature ownership  
**Evidence:** `frontend/src/components/waiter/order-entry/OrderEntryModal.tsx:4–9`, `frontend/src/store/useOrderStore.ts:1–11`, `frontend/src/services/orders/index.ts:1–13`.

Order entry has a UI directory, but imports contracts from `types/floor`, auth and notifications from `store`, and menu persistence from `services/menu.api`. Ordering state is separately organized under `store/order/slices`. Similar scattering exists for settlement and transfer. The direct `components/waiter` directory has 26 files and contains floor layout, delivery intake, history, drawer operations, and modal orchestration.

**Risk:** A feature change requires searching several parallel trees; `waiter` increasingly becomes a container for unrelated business capabilities.

**Fix:** Establish `frontend/src/features/<capability>/` ownership. Move each capability's UI, state, API operations, local models, and fixtures together. Keep the application composition root and genuinely shared infrastructure separate. Preserve the composed Zustand order store where cross-feature transactions need it; moving files does not require introducing independent stores.

### 2. A small state module combines unrelated capabilities

**Severity:** WARNING — Feature ownership  
**Evidence:** `frontend/src/store/order/slices/channels.slice.ts:12`, `:58`, `:105`, `:128`, `:151`; `frontend/src/store/order/order.types.ts:20`.

The 168-line channels module owns takeout, online delivery, drawer entries, chat, and alerts. The root order contract combines these capabilities too. This is a placement/ownership finding even though the file is below 350 lines; it is not included in the oversized-file split count.

**Risk:** Unrelated features acquire an order-engine dependency and future changes keep accumulating in a generic module.

**Fix:** Place those implementations with their owning capabilities and compose them through an explicit store assembly. Keep coupled order operations together. Keep shared order contracts in an explicit order domain rather than duplicating them across features.

### 8. Presentation, application workflows, business rules, and persistence cross module seams

**Severity:** WARNING — Separation of concerns  
**Evidence:** `frontend/src/components/kds/common/UnifiedKdsScreen.tsx:90–120`; `frontend/src/components/waiter/bill-settlement/BillSettlementModal.tsx:50–63`; `frontend/src/store/order/slices/settlement.slice.ts:17–108`; `frontend/src/store/order/slices/hydration.slice.ts:14–60`.

The KDS screen directly queries `inventory_items` and converts database fields into inventory state. The settlement dialog calculates subtotal, tax, total, and payment validity, while the settlement state module also calculates amounts, updates tables/checks/drawer state, translates payment methods to database values, and starts persistence. Hydration embeds a nested Supabase query in the store. The order-entry modal also manages menu fetching and image-persistence calls alongside cart and dialog state (`order-entry/OrderEntryModal.tsx:58–108`).

**Risk:** Mixed responsibilities make file placement and future extraction harder to navigate. Existing coupling is recorded for context, not treated as authorization to change the runtime architecture. Payment correctness and persistence behavior were not audited here.

**Fix:** Organize existing modules by their primary responsibility under each feature's `presentation/`, `application/`, `domain/`, and `data/` folders. Keep the existing Zustand slices and direct API call relationships. Extract an embedded responsibility only when it meets the audit's cohesive-extraction rule and preserves behavior; do not redesign dependencies to force every file to fit a pure layer. Mixed modules can move intact to their primary owning layer. This placement correction applies to smaller files too; the existing 12-file oversized shortlist remains unchanged.

## MEDIUM

### 3. Technical suffixes and redundant entrypoints obscure canonical paths

**Severity:** WARNING — Folder nesting and entrypoints  
**Evidence:** `frontend/src/store/useOrderStore.ts:4–11`; `frontend/src/services/orders.api.ts:6`; `frontend/src/components/waiter/OrderEntryModal.tsx:7`.

There are seven `.slice.ts` files, nine `.api.ts` files, and two `.types.ts` files in the application/package source inventory. One of the type files is generated database output and needs a separate generator decision. Parallel compatibility paths also exist for order entry, bill settlement, table transfer, admin item images, orders API, and tables API: a sibling facade forwards into a folder with its own entrypoint.

**Risk:** Developers have several plausible import paths for one capability, while filenames repeat technical roles that should be clear from location under the requested convention.

**Fix:** Prefer paths such as `features/checkout/application/settle.ts`, `features/orders/data/dispatch.ts`, and `features/orders/domain/order.ts`. Choose one public feature entrypoint; migrate consumers and then remove redundant facades. Use layer folders when they group meaningful responsibilities; keep related code together in small features. Do not create one-file directories solely to eliminate dots. Preserve meaningful platform and tooling suffixes such as `.d.ts`, `.native.tsx`, and `.web.tsx`.

### 4. Extracted UI exists alongside inline implementations, and shared KDS code lives under barista

**Severity:** WARNING — Folder nesting and entrypoints  
**Evidence:** `frontend/src/components/waiter/TableActionModal.tsx:197–709`; `frontend/src/components/waiter/table-action/TableActionRoundList.tsx:24`; `frontend/src/components/waiter/CashDrawerModalView.tsx:149–410`; `frontend/src/components/waiter/cash-drawer/CashDrawerActionModal.tsx:18`; `frontend/src/components/kds/common/UnifiedKdsScreen.tsx:8–14`.

Table action header/tab/round/void components and cash drawer metrics/ledger/action/audit components have no named consumer outside their own files in the source search. Their parents retain matching inline sections. They appear to be unfinished extractions; behavioral equivalence has not been established. Meanwhile, the common KDS screen imports its header, column, types, and stock modals from `barista/`, although both bar and kitchen wrappers use it.

**Risk:** Folders suggest modularization that the active composition does not use. Shared station behavior depends on a particular station's directory, making ownership misleading.

**Fix:** Reconcile each extracted component with the live behavior, then wire it in or remove the unused alternative. Put shared station board code under `features/kds/board/` and station-specific configuration in thin screens. Flatten `barista/screens/` and `kitchen/screens/` when each only holds one configuration wrapper. Keep meaningful `board/` and `runner/` boundaries; folder depth alone is not a defect.

### 5. Compiled package output is tracked beside editable source

**Severity:** WARNING — Build artifact placement  
**Evidence:** `packages/shared/tsconfig.json:2–10`, `packages/printing/tsconfig.json:2–10`; tracked siblings include `packages/shared/src/index.ts`, `index.js`, `index.d.ts`, and corresponding database/HLC outputs; printing has the same index triplet.

Both package compilers enable declaration emission without `outDir`. Compiled JavaScript and declaration siblings are tracked in `src/`. Build metadata also appears at package roots.

**Risk:** The tree contains multiple representations of each module, making ownership and edits ambiguous and creating generated-file churn.

**Fix:** Treat build-output relocation as a separate tooling cleanup, rather than part of the feature-folder move. If pursued, preserve the existing package consumption contract while using a dedicated ignored output directory, align package entrypoints/exports and build metadata with it, and remove tracked emitted siblings after confirming consumers. Keep authored `.d.ts` files and the generated database TypeScript source distinguished from compiler output. Do not simply delete all declarations.

### 6. Architecture guidance reinforces the structure being replaced

**Severity:** WARNING — Architecture documentation  
**Evidence:** `CONTEXT.md:86–93`, `CONTRIBUTING.md:141–145`, `AGENTS.md:90–105`.

These documents prescribe global `store/` and `services/` layouts, suffix-based modules, facade re-exports, and unconditional size limits. Their architecture trees and some advertised line counts no longer describe the current oversized UI files accurately.

**Risk:** Future work may recreate the old structure or split cohesive files mechanically despite the current requirements.

**Fix:** During the approved structural migration, update the architecture examples and navigation pointers together. Document feature ownership, one public entrypoint per feature, justified shared dependencies, and the conditional extraction rule. This audit leaves operating instructions unchanged.

## LOW

### 7. Large modules have useful seams, but size-only splitting would add noise

**Severity:** WARNING — Module responsibility  
**Evidence:** The complete oversized-source inventory below.

There are **129 frontend TypeScript/TSX files**, of which **19 exceed 350 physical lines**. Physical lines include comments, blanks, JSX, styles, and data; they are a screening measure, not executable LOC. Twelve have identifiable extraction boundaries. Seven are deferred under the user's conditional rule.

**Risk:** Large orchestration files hide independently understandable responsibilities; arbitrary chunking would replace this with fragmented files and excessive forwarding.

**Fix:** Extract only the responsibilities identified below, retain orchestration in the owning feature, and reassess the remaining file after each extraction. “Garbage” here means misplaced, repeated, or independently owned code; no code is declared safe to delete just because it is long.

### Files with justified extraction boundaries

Paths are relative to `frontend/src/`. Priority reflects structural value, not runtime severity. Suggested new modules are illustrative destinations, not implemented changes.

| Priority | File                                                        | Lines | Evidence and useful extraction                                                                                                                                                                                                                                                                                      |
| -------- | ----------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | `components/waiter/TableActionModal.tsx`                    | 1,014 | Round derivation at 69–126; header/tab/round sections at 197–410; void dialog at 494–707. Reconcile the existing `table-action/` children, compose the useful ones, and move round derivation into the table-actions model. Keep dialog orchestration together.                                                     |
| 1        | `components/waiter/CashDrawerModalView.tsx`                 |   730 | Metrics at 33–58; ledger at 180–233; action/audit dialogs at 235–410. Reconcile the four existing `cash-drawer/` children and place balance derivation with the drawer feature.                                                                                                                                     |
| 1        | `components/kds/common/UnifiedKdsScreen.tsx`                |   819 | Inventory loading at 90–120, ticket projection at 123–279, arrival effects at 307–334, actions at 337–498. Separate ticket projection, inventory operations, and arrival notification behavior under KDS ownership.                                                                                                 |
| 1        | `components/kds/foh-runner/screens/FohRunnerScreen.tsx`     |   753 | Ticket model at 23–42, projection at 68–179, handoff at 183–240, repeated ticket UI at 289–498. Extract runner ticket projection and `RunnerTicketCard`; keep confirmation orchestration in the screen.                                                                                                             |
| 1        | `components/waiter/WaiterCashierScreen.tsx`                 |   661 | Intake flows at 209–296, submission at 298–357, transfer/payment handlers at 360–445. Extract cohesive intake and table-service workflow hooks, leaving screen composition and navigation. Preserve the existing `FloorGridView`, `useFloorFilters`, and modal cluster.                                             |
| 2        | `components/waiter/table-transfer/TableTransferModal.tsx`   |   582 | Selection step starts at 149; destination picker at 269; review route/details at 367–511. Extract selection and review views inside the table-transfer feature, with one controller owning the draft and confirmation.                                                                                              |
| 2        | `components/waiter/bill-settlement/BillSettlementModal.tsx` |   452 | Payment/tender controls at 190–355 and receipt preview at 357–408 are distinct view responsibilities. Extract controls and preview; keep validation and final confirmation coordinated.                                                                                                                             |
| 2        | `components/shared/SharedChatView.tsx`                      |   477 | Role presets at 65–101 and message rendering/composer at 200–278. Move presets into chat-owned data and extract message list/composer only as cohesive units. Place chat under `features/chat/`, since shared appearance does not make it generic UI.                                                               |
| 2        | `components/waiter/ChecksHistoryView.tsx`                   |   546 | Filtering at 29–44; check list at 153–196; selected-check inspector at 198–261. Extract the list and inspector under check history; keep selected-check state coordinated.                                                                                                                                          |
| 3        | `components/kds/barista/components/BaristaTicketCard.tsx`   |   689 | Relocation banner, header/badges, item list, and stage actions are identifiable sections before styles begin at 277. Extract a coherent ticket header or item-list/action section within KDS board ownership; preserve existing style definitions.                                                                  |
| 3        | `components/kds/common/components/StationTicketCard.tsx`    |   575 | Urgency/order-type presentation at 24–83 and ticket item/action rendering before styles at 328 provide seams. First confirm whether this exported component is still needed: no named render consumer was found. Remove an obsolete alternative instead of splitting it; otherwise extract its item/action section. |
| 3        | `mock/tables.mock.ts`                                       |   616 | Populated bar/cafe scenarios precede generated empty tables at 577–611. Separate meaningful fixture scenarios/table layout under the owning floor feature. Preserve IDs, table order, and reference relationships; do not create arbitrary numbered data chunks.                                                    |

### Oversized files deferred from splitting

These are the remaining seven frontend files over the threshold. They are not automatic split candidates.

| File relative to `frontend/src/`                                  | Lines | Decision                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/waiter/order-entry/OrderEntryModal.styles.ts`         |   660 | Shared by the modal, category bar, grid, cart, and modifier. Ownership is broad, but existing style code must be preserved. Do not create new style files or redistribute existing blocks merely to meet a limit. Revisit only with an explicitly authorized styling change. |
| `components/waiter/bill-settlement/BillSettlementModal.styles.ts` |   380 | Cohesive legacy styles. Retain under the preservation rule.                                                                                                                                                                                                                  |
| `components/waiter/TableCard.tsx`                                 |   372 | Styles start at 196; one cohesive card. No compelling independent responsibility identified.                                                                                                                                                                                 |
| `components/waiter/OpenTableTabModal.tsx`                         |   368 | Styles start at 194; one tab-opening form. No justified split identified.                                                                                                                                                                                                    |
| `components/waiter/OnlineDeliveryModal.tsx`                       |   356 | Styles start at 183; one delivery-intake form. Six lines over the threshold is insufficient reason to split.                                                                                                                                                                 |
| `components/waiter/TableFilterBar.tsx`                            |   464 | Repeated channel/status pills precede styles at 307, but no named active consumer was found beyond its barrel export. Determine whether this is obsolete beside `UnifiedCommandBar` before introducing children.                                                             |
| `components/waiter/UnifiedCommandBar.tsx`                         |   410 | Styles start at 221; cohesive channel/actions/status toolbar already uses descriptor arrays. Keep together unless an independently reusable control emerges.                                                                                                                 |

### Large files outside the frontend shortlist

- `packages/shared/src/database.types.ts` — 1,084 lines, generated by the root `supabase:types` command. Do not hand-split generator output. To satisfy folder-based naming, update the generator and consumers together to a path such as `database/generated.ts`; preserve one generated source of truth.
- `packages/shared/src/database.types.d.ts` — 903 lines of emitted declarations. Address as build output under finding 5, not a source-module split.
- `supabase/migrations/20261017000000_init_pos_schema.sql` — 464 lines. Preserve chronological migration identity; do not retroactively divide applied history to satisfy source-size preferences. Future migrations can follow cohesive change boundaries.
- Bundled `.agents/skills/` tooling contains files over 350 lines. It is agent tooling rather than POS feature code and was excluded from product splitting recommendations. Generated/vendor/build files and binary assets were excluded from source review.

## Recommended feature tree

Illustrative layout; no files have been moved. Nesting expresses ownership first and a technical role second where it earns a folder.

```text
frontend/
  App.tsx                          # Existing role-based composition
  src/
    features/
      auth/
      floor/                       # Grid, filters, table presentation
      table-service/
        table-actions/
        table-transfer/
      orders/
        index.ts                   # Public feature surface
        presentation/
          OrderEntryModal.tsx
          useOrderEntry.ts         # UI-only state stays with its view
        application/
          dispatch.ts              # Existing workflow implementation
          state/                   # Existing composed Zustand store and slices
        domain/                    # Business layer
          rounds.ts                # Existing/extracted round derivation
          order.ts                 # Existing domain types
        data/
          dispatch.ts              # Supabase queries/RPC and row conversion
          hydration.ts
          realtime.ts
      checkout/
        presentation/              # Payment controls and receipt preview
        application/               # Settlement workflow coordination
        domain/                    # Amounts and payment eligibility rules
        data/                      # Settlement/payment persistence
      check-history/
      takeout/
      delivery/
      cash-drawer/
      menu/
      kds/
        board/                     # Common station board + station configs
        runner/
      chat/
      alerts/
    shared/
      ui/                          # Only generic controls, e.g. confirmation
      notifications/               # Toast infrastructure
      navigation/
      infrastructure/
        supabase/                  # Client, base transport, channel plumbing
packages/
  shared/src/                      # Contracts used across package boundaries
  printing/src/                    # Linux printer capability
supabase/
  migrations/                      # Chronological runner contract
  seed.sql
scripts/                           # Operational repository commands
```

Keep one canonical public entrypoint for each externally consumed feature. Other features should consume that public surface, not reach through UI internals. Shared infrastructure should not import feature UI. Shared order lifecycle operations can remain in the orders domain. Split chat/drawer ownership without forcing unrelated state-store redesign. Keep transport channel plumbing separate from order-specific realtime handlers. Add layer folders where responsibilities justify them, and avoid an `index.ts` at every intermediate directory.

## Separation of concerns: folder responsibilities

**Decision:** Use exactly **Presentation, Application, Domain, and Data** as the organizing vocabulary. Directory names are lowercase. Architecture stays the same; this is a feature-first reorganization with selective, behavior-preserving code extraction.

```text
features/<feature>/
  presentation/   # Views, UI hooks, UI-only state
  application/    # Existing workflows, composed stores, state operations
  domain/         # Existing domain types, calculations, business rules
  data/           # Existing API modules, Supabase queries, transport mapping
```

Create folders only when they contain relevant code; do not generate empty layers or extra forwarding modules. Keep the shared order store composed as it is today, even when it coordinates multiple capabilities. Keep tightly coupled state operations together rather than breaking store ownership solely to match folder names.

| Folder       | Place existing responsibilities here                                                                                                                               | Preserve during the move                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Presentation | React Native screens/views, dialogs, input handling, formatting, UI hooks, and local view state. Existing styles remain with their views.                          | Rendering, callbacks, existing styles, and view behavior.                                                             |
| Application  | Dispatch, settlement, transfer, handoff, hydration/replay coordination, and existing Zustand store composition/state operations.                                   | Direct calls to existing API modules, operation order, optimistic updates, store subscriptions, and failure behavior. |
| Domain       | Existing feature models/types, billing calculations, lifecycle decisions, round grouping, and eligibility helpers where already separate or justifiably extracted. | Current formulas, rules, shared contracts, and authoritative SQL behavior. No mandatory domain-model rewrite.         |
| Data         | Existing Supabase API modules, queries, RPC calls, row conversion, enum mapping, realtime transport, and queue persistence where present.                          | Existing API interfaces, database schema, RPC signatures, subscription behavior, and persistence semantics.           |

These are placement responsibilities, not a new enforced dependency graph. An existing store may continue calling concrete API modules. Do not add repositories, ports/adapters frameworks, new interface hierarchies, dependency injection, controller layers, or event buses to complete a folder move.

Evidence for Application placement includes `store/order/slices/realtime.slice.ts:5–10` (startup coordination), `hydration.slice.ts:278–305` (queued operation execution), and `settlement.slice.ts:17–108` (settlement coordination). Keep these workflows intact unless a specific extraction has been justified separately.

For mixed modules, choose the folder matching their primary role first. For example, a hydration slice can move into Application while retaining its embedded Supabase query. Extract that query into Data only as a separate, justified cleanup that preserves inputs, results, timing, and errors. Do not invent a new abstraction simply to make the directory label perfectly pure.

Supporting locations remain practical:

- `frontend/App.tsx` retains role-based navigation and the current synchronization startup lifecycle.
- Shared Supabase setup/channel plumbing and other genuinely shared infrastructure retain a common location; they are not a fifth feature layer.
- Zustand is a state mechanism. Shared composed stores belong with Application; view-only draft state belongs with Presentation. Preserve the current store count and composition.
- `packages/printing/` keeps the Linux ESC/POS implementation and its package interface. Data covers external I/O conceptually, but no package move or printer integration redesign is required.
- `supabase/migrations/` and `supabase/seed.sql` retain their tooling layout. RLS, constraints, and atomic RPCs stay in SQL. Layer names do not determine where authoritative rules must execute.

Move one feature at a time, update imports, and verify behavior. Existing compatibility entrypoints may remain during migration; removing a duplicate forwarding file must preserve the exported interface for migrated consumers. Any changes to transaction sequencing, retry policy, calculations, or dependency direction are separate architecture work, outside this reorganization.

This folder-based separation is distinct from lazy loading or bundle splitting, which were not assessed.

## Files With Zero Violations

No file-by-file runtime cleanliness is claimed. The following placements have no structural finding in this limited audit:

- `frontend/App.tsx` as the role-based composition root.
- `packages/printing/src/index.ts` as a cohesive printer capability below the extraction threshold.
- `supabase/migrations/` and `supabase/seed.sql` as database-tooling entrypoints.
- `scripts/lint-migrations.sh` and the other operational scripts under `scripts/`.
- Implementation blueprints under `phases/` and reference/design artifacts under `docs/`.

## Things that we're done correctly

- Table transfer, order entry, checkout, and item-image UI already have local ownership folders; these provide starting points for complete feature ownership.
- `frontend/src/store/useOrderStore.ts:16–34` composes focused implementations behind one store interface. Preserve that composition while improving module locations.
- `FloorGridView`, `useFloorFilters`, and `WaiterModalsCluster` are already used by the floor screen; further extraction can build on those boundaries.
- Bar and kitchen screens configure the same `UnifiedKdsScreen`, avoiding separate station workflow implementations.
- Database migrations, printing, application code, and operational scripts already have sensible top-level boundaries.

## Priority Fix Roadmap

1. Align architecture guidance with feature ownership and the conditional 350-line screening rule.
2. Reconcile the unused table-action and drawer extractions with live parent behavior before creating more files.
3. Move one capability end to end into the four folder responsibilities, updating imports while preserving the current implementation and exported interfaces. Establish the convention through that concrete feature. Do not introduce new abstractions or change workflow sequencing.
4. Extract KDS/runner ticket projections and floor workflow orchestration; move common station code out of `barista/`.
5. Extract transfer steps, checkout controls/preview, history inspector, and chat-owned data/views.
6. Remove obsolete alternatives and compatibility facades after migrating consumers. Separate package source from emitted artifacts.
7. Recount remaining large files. Keep cohesive styles, generated contracts, migration history, and short single-purpose forms intact unless new evidence justifies extraction.

## Validation

Source inventory, physical line counts, scoped source reads, import/export searches, tracked-artifact checks, and configuration inspection underpin this report. Suggested extractions have not been implemented or behaviorally validated.

| Check            | Result                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | Passed across the workspace packages.                                                                                            |
| `pnpm lint`      | Completed with 0 errors and 269 existing warnings.                                                                               |
| `pnpm db:lint`   | Passed the repository SQL guardrail script.                                                                                      |
| `pnpm build`     | Passed. Package TypeScript builds ran; the frontend target only echoes a verification message and does not build an Expo bundle. |

The worktree was clean before the audit; after verification, only this report was added.

_Generated on 2026-10-20. Heuristic N+1 analysis was not included because the user restricted this audit to file structure and code-splitting opportunities._
