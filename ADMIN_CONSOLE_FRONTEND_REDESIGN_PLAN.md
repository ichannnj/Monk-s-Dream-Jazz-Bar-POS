# Admin Console Frontend Redesign — Implementation Plan

## Purpose

Refresh the Monk's Dream admin console so it feels deliberate, calm, and operationally credible rather than assembled from unrelated dashboard patterns. The work is frontend-only and must preserve existing routes, workflows, data contracts, realtime behavior, statutory calculations, and permissions.

This document is intended to be handed to implementation models. It defines the visual direction, rollout order, file seams, constraints, and acceptance criteria. It is a plan, not an authorization to modify product code outside the implementation scope described here.

## Decisions already made

- Use a restrained jazz-venue operations aesthetic.
- Retain the burgundy/gold brand identity, but make it quieter: charcoal, warm stone, cream, and muted brass should form most surfaces.
- Remove decorative structural emoji from admin UI. Use `lucide-react-native` icons with text labels instead.
- Keep the console responsive from approximately 390px through tablet and desktop widths.
- Preserve the existing tablet-first POS ergonomics: minimum 48px touch targets and minimum 16px text for new or modified UI.
- Keep the work frontend-only. Do not change database schema, RPCs, domain formulas, authentication, permissions, or workflow semantics.
- Establish shared admin tokens and primitives before migrating individual screens.
- Use a medium-density layout: organized information density, fewer competing controls, progressive disclosure for advanced actions.
- Keep shared primitives inside `frontend/src/features/admin/presentation/components/` unless an existing canonical shared primitive is required.
- Preserve existing `StyleSheet.create` blocks. New components must use NativeWind v4; existing views may receive isolated NativeWind additions.
- Completion requires visual review at approximately 390px, 768px, and 1280px, plus frontend typecheck, lint, and production web build.

## Current findings

The highest-leverage seam is the admin shell.

- `AdminBackOfficeScreen` owns route state locally and renders all admin views.
- Desktop uses `AdminSidebar`, `AdminHeader`, route content, and floating chat.
- Mobile/tablet uses `AdminHeader`, route content, `AdminBottomNav`, and `AdminMobileDrawer`.
- `AdminSidebar` and `AdminMobileDrawer` duplicate navigation definitions.
- `AdminHeader` receives a drawer callback but currently does not render a mobile/tablet drawer trigger.
- The current route is passed to the header but is not being used as a clear page-context treatment.
- Styling mixes raw hex values, `stone`, `rose`, `amber`, `sky`, `jazz-*`, `wine-*`, and `stage-*` tokens.
- Admin surfaces frequently stack rounded cards, shadows, tinted icon boxes, and badges.
- Several admin areas still contain `text-xs`, `text-sm`, or one-off pixel sizes that conflict with the frontend typography floor.
- Structural emoji appear in mode messages, inventory statuses/categories, menu categories, station labels, variant labels, readings, table layout, and export labels.

Relevant implementation anchors:

- `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- `frontend/src/features/admin/presentation/components/AdminSidebar.tsx`
- `frontend/src/features/admin/presentation/components/AdminHeader.tsx`
- `frontend/src/features/admin/presentation/components/AdminMobileDrawer.tsx`
- `frontend/src/features/admin/presentation/components/AdminBottomNav.tsx`
- `frontend/src/features/admin/presentation/views/AdminDashboardView.tsx`
- `frontend/src/features/admin/presentation/views/AdminInventoryView.tsx`
- `frontend/src/features/admin/presentation/views/AdminTransactionsView.tsx`
- `frontend/src/features/admin/presentation/views/AdminReadingsView.tsx`
- `frontend/src/features/admin/presentation/views/AdminStaffView.tsx`
- `frontend/src/features/admin/presentation/views/AdminAttendancePayrollView.tsx`
- `frontend/src/features/shared/ui/PosDropdown.tsx`
- `frontend/tailwind.config.js`

## Non-goals and safety constraints

Do not:

- Change SQL, migrations, RPC names, database types, RLS, or realtime subscriptions.
- Change tax/VAT, service-charge, discount, payroll, operating-mode, settlement, or fiscal-reading calculations.
- Change role permissions, route semantics, login behavior, or manager approval behavior.
- Introduce Expo Router, web DOM elements, a new icon dependency, or a second global design system.
- Broadly convert existing `StyleSheet.create` code.
- Add rigid desktop widths without mobile overrides.
- Reduce text below the existing 16px minimum in modified/new admin UI.
- Replace a meaningful status label with an icon-only treatment.
- Use emoji as the only indicator of state, category, urgency, or action.

## Target visual language

### Palette

Keep brand recognition through restrained burgundy and brass. Use named tokens rather than repeated raw values.

Recommended semantic token families:

| Token role               | Direction                | Usage                                 |
| ------------------------ | ------------------------ | ------------------------------------- |
| `admin-canvas`           | warm cream/light stone   | page background                       |
| `admin-surface`          | warm white               | primary cards and panels              |
| `admin-surface-muted`    | pale stone               | secondary grouping and table headers  |
| `admin-surface-elevated` | white/near-white         | dialogs and focused overlays          |
| `admin-border`           | muted warm gray          | panel and control boundaries          |
| `admin-primary`          | restrained burgundy      | primary actions and active navigation |
| `admin-primary-strong`   | deeper burgundy          | pressed/hover/focus states            |
| `admin-brass`            | muted gold               | selected accent and venue identity    |
| `admin-text`             | charcoal                 | primary text                          |
| `admin-text-muted`       | warm gray                | supporting text                       |
| `admin-success`          | controlled green         | healthy/complete states               |
| `admin-warning`          | amber                    | attention/below par/pending states    |
| `admin-danger`           | restrained red           | destructive/depleted/error states     |
| `admin-focus`            | high-contrast focus ring | keyboard and accessibility focus      |

Prefer the existing Tailwind configuration and NativeWind conventions. Add only the minimum named tokens needed to eliminate raw-value drift.

### Geometry and depth

- Use a small, intentional radius scale instead of defaulting every element to `rounded-xl` or `rounded-2xl`.
- Use one modest elevated-panel shadow vocabulary.
- Avoid rounded cards inside rounded cards unless the inner item is a clearly interactive control.
- Use borders and spacing to create grouping before adding shadows.
- Keep primary actions visually distinct without turning every control into a filled pill.

### Typography

- Use the existing named `text-pos-*` scale where available.
- All new or modified text must remain at least 16px.
- Use stronger hierarchy for page title, section title, metric, label, and supporting description.
- Do not compensate for poor hierarchy with bold text on every element.
- Replace promotional or vague copy with concise operational copy.

Examples:

- `🎷 Event Mode Activated!` → `Event mode enabled`
- `☀️ Daytime Cafe Mode Activated!` → `Cafe mode enabled`
- `🟢 In-Par` → `In par`
- `🔴 Depleted` → `Depleted`

Icons and status color may accompany these labels, but the text remains the source of meaning.

## Shared architecture to add first

Keep these components under `frontend/src/features/admin/presentation/components/`. Names may be adjusted if an equivalent existing component is discovered, but do not create duplicate abstractions.

### Admin navigation model

Create a typed navigation definition, for example:

```ts
type AdminNavigationItem = {
  route: AdminRoute;
  label: string;
  description?: string;
  group: 'operations' | 'manage' | 'reports' | 'account';
  icon: LucideIcon;
  badge?: number;
  mobilePriority?: 'primary' | 'secondary';
};
```

The model becomes the source of truth for:

- `AdminSidebar`
- `AdminMobileDrawer`
- `AdminBottomNav`
- current-route context in `AdminHeader`

Do not duplicate route labels, icon choices, or group membership in each navigation component. Keep route state local as it is today unless a separate routing task is explicitly approved.

### Recommended primitives

Add only primitives that remove repeated visual decisions:

- `AdminPageHeader`: title, description, context/action slot, optional route metadata.
- `AdminSectionCard`: consistent surface, border, padding, and optional section header.
- `AdminMetricCard`: metric value, label, delta/context, semantic state, optional icon.
- `AdminStatusBadge`: icon plus text, semantic tone, accessible label.
- `AdminIconBadge`: compact icon container for non-status visual support.
- `AdminActionButton`: primary/secondary/quiet/destructive variants with touch-target guarantees.
- `AdminNavigationItem`: shared selected, pressed, disabled, badge, and icon behavior.

Each primitive should:

- Use React Native primitives only.
- Use NativeWind for new styling.
- Preserve a 48px minimum interactive dimension.
- Accept semantic variants rather than arbitrary color props.
- Support loading/disabled states without changing layout unexpectedly.
- Avoid requiring callers to know raw colors, radii, or shadow values.

Do not build a large generic component library. These primitives should be deep enough to own visual policy while remaining simple to consume.

## Rollout phases

### Phase 0 — Baseline and audit

Before editing UI:

1. Capture the current admin shell, dashboard, inventory, transactions/readings, and staff/attendance at approximately 390px, 768px, and 1280px.
2. Record current route behavior, drawer access, bottom-nav behavior, mode switching, chat access, loading states, and modal entry points.
3. Run targeted audits:

```bash
rg -n --pcre2 '[\\x{1F300}-\\x{1FAFF}]' frontend/src/features/admin frontend/src/features/shared
rg -n 'text-xs|text-sm|text-\\[[0-9]+px\\]' frontend/src/features/admin/presentation
rg -n '#800020|#4A1020E0|#fcf9f9' frontend/src/features/admin frontend/src/features/shared
```

4. Identify any existing equivalent components before adding new primitives.

### Phase 1 — Tokens and primitives

Likely files:

- `frontend/tailwind.config.js`
- `frontend/src/features/admin/presentation/components/`
- `frontend/src/features/admin/presentation/components/index.ts`

Tasks:

- Add semantic admin palette tokens.
- Define the small radius, spacing, border, and shadow vocabulary.
- Add the shared primitives listed above.
- Add or reuse a consistent status-tone mapping.
- Ensure the new components are NativeWind-based and touch-safe.
- Add no workflow-specific logic to primitives.

Verification gate:

- Primitives render in isolation or in a small existing screen seam.
- Typecheck and lint pass before migrating screens.

### Phase 2 — Navigation model and shell

Likely files:

- `AdminBackOfficeScreen.tsx`
- `AdminSidebar.tsx`
- `AdminHeader.tsx`
- `AdminMobileDrawer.tsx`
- `AdminBottomNav.tsx`
- new navigation-model file under admin components or presentation navigation

Tasks:

- Consolidate navigation definitions.
- Use Lucide icons consistently.
- Make the current route visible in the header hierarchy.
- Add an obvious mobile/tablet drawer trigger to the header.
- Preserve bottom-nav priority routes while exposing all routes through the drawer or route selector.
- Use `PosDropdown` where route or grouped action selection is appropriate.
- Normalize profile, mode, chat, and floor-switch controls.
- Reduce header control density and clarify left-to-right hierarchy: page context, operational mode, actions, identity.
- Preserve unread badges and access to chat.

Acceptance gate:

- Every existing admin route remains reachable.
- Desktop sidebar and mobile/tablet drawer show the same labels, icons, and grouping.
- The drawer is reachable without relying solely on the bottom “More” action.
- No route state or permission behavior changes.

### Phase 3 — Dashboard and inventory

Likely files:

- `AdminDashboardView.tsx`
- `views/dashboard/DashboardKpiAndModeSection.tsx`
- `views/dashboard/DashboardLaborAndPayrollSection.tsx`
- `views/dashboard/DashboardChartsAndTendersSection.tsx`
- `views/dashboard/DashboardBestSellersAndStationsSection.tsx`
- `views/dashboard/DashboardAlertsSection.tsx`
- `AdminInventoryView.tsx`
- `views/inventory/components/InventoryHeaderAndTabs.tsx`
- `InventoryStockKpiAndFilters.tsx`
- `InventoryStockTable.tsx`
- `InventoryMovementsAndAuditSection.tsx`
- `InventorySuppliersSection.tsx`

Tasks:

- Replace repeated ad hoc KPI cards with `AdminMetricCard` where semantics match.
- Normalize section headers and surface geometry.
- Replace emoji mode/status treatments with icons, text, and semantic status tones.
- Keep operational mode warnings prominent but restrained.
- Use dropdown-first filters where horizontal controls become crowded.
- Preserve inventory table-to-card responsive behavior.
- Keep quick adjust, restock, supplier, stocktake, waste, and audit actions unchanged.
- Make loading, empty, stale, below-par, depleted, and error states visually consistent.

Important domain invariants to preserve:

- Inventory remains orderable at low or negative stock; this is a visual cleanup only.
- Admin payroll exemption remains reflected exactly as before.
- Event/Cafe reporting labels and values remain unchanged except for presentation copy.

### Phase 4 — Transactions, readings, and reports

Likely files:

- `AdminTransactionsView.tsx`
- `views/transactions-overview/`
- `AdminCashlessTransactionsView.tsx`
- `AdminReadingsView.tsx`
- `views/readings/`
- `views/analytics/`
- `AdminTrendsReportView.tsx`

Tasks:

- Normalize financial overview, tender, variance, and status treatments.
- Replace event-mode emoji labels in on-screen reports and export labels where they are structural.
- Preserve all X/Y/Z reading safety guards, scopes, numbering, settlement behavior, and export content meaning.
- Keep print-only document requirements intact; changes to printed output must be separately reviewed because these are operational records.
- Use consistent filter and timeframe controls with clear active state.
- Keep dense data tables readable and responsive without reducing the 16px floor.

### Phase 5 — Staff and attendance

Likely files:

- `AdminStaffView.tsx`
- `views/staff/`
- `AdminAttendancePayrollView.tsx`
- `views/attendance/`

Tasks:

- Apply shared page headers, cards, buttons, form controls, table/card states, and status badges.
- Make credential, payroll-exempt, active/inactive, clocked-in, clocked-out, and absent states semantic and text-readable.
- Preserve all admin password/PIN flows and authorization boundaries.
- Preserve 6:00 AM business-day alignment, split-shift behavior, realtime attendance refresh, and payroll calculations.
- Ensure staff tables become structured cards or safe horizontal-scroll regions on smaller widths.

### Phase 6 — Remaining admin views and global cleanup

Apply the established system to:

- `AdminRecipesView.tsx` and menu/BOM subcomponents.
- `AdminSettingsView.tsx` and QR payment manager.
- `AdminProfileView.tsx` and profile cards.
- `AdminTableLayoutView.tsx`.
- `AdminStationsView.tsx` and station reset modal.
- `AdminEventsView.tsx`.
- shared admin modals, inputs, upload fields, and floating chat.

Perform the structural emoji audit across admin-facing source and exports. Replace only structural UI emoji. Preserve user-authored content where applicable.

## Emoji and icon migration map

Use existing Lucide icons where they already exist in a component. Otherwise choose the closest semantic icon and document the choice in the implementation PR.

| Current meaning       | Preferred treatment                                               |
| --------------------- | ----------------------------------------------------------------- |
| Event mode            | `Music`, `Sparkles`, or `Calendar` icon plus `Event mode` text    |
| Cafe mode             | `Sun` or `Coffee` icon plus `Cafe mode` text                      |
| Hot / iced            | `Flame` / `Snowflake` icon plus `Hot` / `Iced` text               |
| Bar / kitchen station | `Wine`, `Coffee`, `Utensils`, or `ChefHat` icon plus station text |
| Inventory healthy     | semantic success dot/icon plus `In par`                           |
| Inventory below par   | warning icon plus `Below par`                                     |
| Inventory depleted    | danger icon plus `Depleted`                                       |
| Product category      | icon plus plain category label                                    |
| Waste reason          | icon is optional; reason text must remain explicit                |

Do not use emoji in toast titles, operational alerts, export labels, or accessibility labels merely for personality. Do not perform a blind global replacement: inspect each occurrence because some labels may be user content or output-specific.

## Responsive behavior requirements

### Approximately 390px

- Header actions remain reachable without clipping.
- Page title and context wrap cleanly.
- Bottom navigation remains touch-safe.
- Drawer opens from an obvious control.
- KPI cards stack or use a deliberate horizontal scroll pattern.
- Tables become cards or clearly bounded horizontal-scroll regions.
- Advanced filters move into a dropdown or modal.

### Approximately 768px

- Tablet layouts use two- or three-column groupings where readable.
- Navigation does not compete with data content.
- Modals and forms use available width without rigid desktop sizing.
- Touch targets remain at least 48px.

### Approximately 1280px

- Sidebar, header, and content align to a consistent grid.
- Dashboard sections do not become a wall of nested cards.
- Tables retain readable column hierarchy.
- Content has a deliberate maximum measure without leaving excessive unused space.

## Verification plan

Run focused checks after each major phase and the complete repository checks before handoff.

Frontend checks:

```bash
pnpm --filter @monks/frontend typecheck
pnpm --filter @monks/frontend lint
pnpm --filter @monks/frontend build
```

Repository checks required by `AGENTS.md` when implementation is complete:

```bash
pnpm typecheck
pnpm lint:quiet
pnpm db:lint
pnpm sync:knowledge
pnpm build
```

Targeted audits:

```bash
rg -n --pcre2 '[\\x{1F300}-\\x{1FAFF}]' frontend/src/features/admin frontend/src/features/shared
rg -n 'text-xs|text-sm|text-\\[[0-9]+px\\]' frontend/src/features/admin/presentation
rg -n '#800020|#4A1020E0|#fcf9f9' frontend/src/features/admin frontend/src/features/shared
```

The emoji audit should return only intentionally preserved user-authored or explicitly approved content. The typography audit should return only legacy untouched areas or cases documented as exceptions.

### Functional regression checklist

- Every admin route is reachable from desktop and mobile/tablet navigation.
- Dashboard refresh, timeframe changes, realtime refresh, and visibility revalidation still work.
- Operating-mode switch still requires the same confirmation and manager authorization.
- Inventory actions, low-stock states, and audit surfaces retain their behavior.
- Transactions, cashless records, readings, exports, and print actions retain their behavior.
- Staff credential and admin security flows remain unchanged.
- Attendance and payroll calculations remain unchanged, including payroll exemption.
- Chat access, unread counts, profile access, and floor switching remain available.
- No web DOM elements or Expo Router are introduced.

### Visual regression checklist

Review all first-wave screens at 390px, 768px, and 1280px:

- No clipped controls or inaccessible actions.
- No competing palette systems within one screen.
- No unnecessary nested cards or excessive shadows.
- Page title, current route, mode, actions, and user identity are understandable at a glance.
- Status meaning is available in text, not only color or icon.
- Loading, empty, error, warning, and success states share a consistent visual language.
- Text remains readable without relying on sub-16px labels.
- Focus/pressed/disabled states are visible.

## Definition of done

The redesign is complete only when:

1. The admin visual tokens and primitive contracts are documented in code and used by the first implementation wave.
2. Sidebar, header, drawer, and bottom navigation consume one typed navigation model.
3. The shell, dashboard, inventory, transactions/readings, and staff/attendance surfaces use the new visual system.
4. Structural emoji are removed or explicitly justified.
5. Remaining views have a documented migration backlog and do not introduce new visual patterns.
6. Existing admin workflows, routes, permissions, realtime refreshes, and domain behavior are unchanged.
7. Responsive review passes at approximately 390px, 768px, and 1280px.
8. Frontend typecheck, lint, and build pass; required repository checks are run and any unrelated baseline failures are recorded clearly.

## Handoff notes for implementation models

- Read `/AGENTS.md` and `frontend/AGENTS.md` before editing.
- Use surgical file reads; do not read large files in full.
- Inspect existing components before creating a new primitive.
- Prefer small, reviewable commits or phases with a clear visual checkpoint.
- Keep business logic and data boundaries untouched.
- If a visual requirement appears to require a workflow or database change, stop and document the conflict instead of silently expanding scope.
- Report changed files, verification commands, visual checkpoints, and any deferred migrations in the final handoff.
