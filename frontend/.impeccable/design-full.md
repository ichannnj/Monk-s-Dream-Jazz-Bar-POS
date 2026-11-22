---
name: Monk's Dream Jazz Bar POS
description: Warm minimalist hospitality POS pairing Velvet Wine authority, Warm Sand surfaces, and tablet-first 48px/16px ergonomics.
colors:
  velvet-wine: '#810021'
  wine-action: '#641b2a'
  admin-primary: '#6e1d2c'
  warm-sand: '#faf8f5'
  admin-canvas: '#f8f6f4'
  pure-surface: '#f5f5f5'
  stone-border: '#e7e5e4'
  admin-border: '#e6e1da'
  deep-charcoal: '#1c1917'
  muted-stone: '#78716c'
  admin-muted: '#6a6562'
  brass-accent: '#b48a3c'
  ready-emerald: '#10b981'
  prep-amber: '#f59e0b'
  danger-rose: '#b32638'
  jazz-obsidian: '#0d1117'
typography:
  display:
    fontFamily: '"Raconteur NF", Fraunces, "Playfair Display", Georgia, serif'
    fontSize: '1.75rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '0.01em'
  headline:
    fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 800
    lineHeight: 1.33
    letterSpacing: '-0.02em'
  title:
    fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 700
    lineHeight: 1.44
    letterSpacing: '-0.01em'
  body:
    fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: '1rem'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: '0em'
  label:
    fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: '1rem'
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: '0.01em'
rounded:
  md: '12px'
  lg: '14px'
  xl: '20px'
  full: '9999px'
spacing:
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
components:
  button-primary:
    backgroundColor: '{colors.velvet-wine}'
    textColor: '{colors.pure-surface}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '12px 16px'
    height: '48px'
  button-secondary:
    backgroundColor: '{colors.pure-surface}'
    textColor: '{colors.deep-charcoal}'
    typography: '{typography.label}'
    rounded: '{rounded.lg}'
    padding: '10px 14px'
    height: '48px'
  input-touch:
    backgroundColor: '{colors.pure-surface}'
    textColor: '{colors.deep-charcoal}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '10px 14px'
    height: '48px'
  card-table:
    backgroundColor: '{colors.pure-surface}'
    textColor: '{colors.deep-charcoal}'
    rounded: '{rounded.xl}'
    padding: '15px'
    height: '196px'
  chip-status:
    backgroundColor: '{colors.warm-sand}'
    textColor: '{colors.muted-stone}'
    rounded: '{rounded.md}'
    padding: '9px 12px'
    height: '48px'
---

# Design System: Monk's Dream Jazz Bar POS

## Overview

**Creative North Star: "The Velvet Ledger"**

Monk's Dream Jazz Bar POS pairs the calm tactility of an espresso-and-vinyl hospitality ledger with high-speed operational clarity. Floor, modal, and back-office surfaces sit on Warm Sand (`#faf8f5`) and crisp white cards (`#ffffff`) anchored by Deep Charcoal ink (`#1c1917`), while Monk's Dream Velvet Wine (`#810021`) marks primary actions, active selections, and Event Mode authority.

Because staff operate handheld tablets and touch terminals at arm's length under both sunlit daytime cafe service and dim evening jazz lighting, decoration and explanatory clutter stay out of the way. Status meaning comes from crisp 2px card borders, tabular-numeral timers, and generous touch targets rather than multi-color gradients or dense microcopy.

**Key Characteristics:**

- Strictly 3-color core floor & modal palette: Velvet Wine, Warm Sand / White, and Deep Charcoal (with Muted Stone for secondary metadata).
- Tablet-first ergonomics: ≥ 48px touch targets and a strict ≥ 16px text/input floor on all new and modified components.
- Crisp hairline borders (`#e7e5e4`) and flat-by-default surfaces with whisper-quiet ambient depth on interactive cards.
- NativeWind v4 utility styling for all new/added JSX alongside untouched legacy `StyleSheet.create` views (Isolated Hybrid invariant).

## Colors

A disciplined warm-neutral foundation keeps high-throughput order screens effortless to scan while reserving Velvet Wine exclusively for decisive intent.

### Primary

- **Velvet Wine** (`#810021`): Primary CTAs, active navigation tabs, Event Mode pill state, served table borders, and focused input accents.
- **Wine Action** (`#641b2a`) / **Admin Primary** (`#6e1d2c`): Quick-action floor triggers, brand emblem stroke (`JazzLogo`), and back-office primary actions.

### Secondary

- **Warm Brass** (`#b48a3c`): Subtle hospitality highlight for featured admin callouts and jazz-lounge badges; used sparingly to never compete with Velvet Wine.

### Neutral

- **Warm Sand** (`#faf8f5`) & **Admin Canvas** (`#f8f6f4`): Global screen and drawer backgrounds that eliminate harsh clinical glare.
- **Pure Surface** (`#ffffff`): Elevated table cards, modal sheets, inputs, and inspection panels.
- **Stone Border** (`#e7e5e4`) & **Admin Border** (`#e6e1da`): 1px–1.5px hairline dividers separating cards, headers, and list rows.
- **Deep Charcoal** (`#1c1917`): Primary headings, table numbers, currency totals, and input values.
- **Muted Stone** (`#78716c`) & **Admin Muted** (`#6a6562`): Secondary timestamps, round counts, empty-state metadata, and clear-icon strokes.
- **Jazz Obsidian** (`#0d1117`): App splash/shell dark backdrop and dark-surface KDS accents where legacy dark surfaces persist.

### Semantic Status (Restricted to Live Order & Alert State)

- **Ready Emerald** (`#10b981`): Ready-for-pickup table card borders and FOH buzzout readiness indicators.
- **Prep Amber** (`#f59e0b`): Preparing table card borders and offline-sync queue warning pills.
- **Danger Rose** (`#b32638`): Validation errors, destructive void actions, and required field asterisks.

### Named Rules

**The Three-Color Floor Rule.** Floor and modal surfaces rely solely on Warm Sand/White surfaces, Deep Charcoal typography, and Velvet Wine emphasis; semantic Emerald/Amber/Rose appear strictly for live prep status, errors, or offline warnings.

## Typography

**Display Font:** `"Raconteur NF", Fraunces, "Playfair Display", Georgia, serif`
**Body Font:** `"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
**Label/Mono Font:** `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Character:** Expressive Art-Deco/Jazz serif (`Raconteur NF`) is reserved for the Monk's Dream wordmark and brand hero headers, while `Plus Jakarta Sans` with `tabular-nums` handles every operational label, check item, and price at instant glance speed.

### Hierarchy

- **Display** (`700`, `28px` / `1.75rem`, `line-height: 1.25`): Station titles and brand headers (`text-pos-2xl`, `font-brand` up to `48px` on hero lockups).
- **Headline** (`800`, `24px` / `1.5rem`, `line-height: 1.33`): Modal titles, order totals, and drawer balances (`text-pos-xl`).
- **Title** (`700`, `18px–20px`, `line-height: 1.44`): Table codes, section headers, and primary action labels (`text-pos-md` / `text-pos-lg`).
- **Body** (`500`, `16px` / `1rem`, `line-height: 1.5`): Standard menu rows, form inputs, timestamps, badges, and helper copy (`text-base` / `text-pos-base`).
- **Label** (`700`, `16px` / `1rem`, `line-height: 1.5`): Button labels, filter chips, and navigation items in new/modified views.

### Named Rules

**The 16px Anti-Zoom Floor Rule.** Every text element and form input in new or modified views must be at least `16px` (`text-base` / `text-pos-base`). Never introduce `text-xs`, `text-sm`, `text-pos-xs`, or `text-pos-sm` in new or edited JSX—this guarantees arm's-length readability and prevents WebKit/iOS Safari input auto-zoom.

**The Tabular Numerals Rule.** All timers, currency amounts (`₱`), table counts, and receipt lines inherit `font-variant-numeric: tabular-nums` so numbers never jitter during live updates.

## Layout

- **Responsive Breakpoints:**
  - **Mobile (`< 768px`, `mobile: 360px`):** Single-column stacked layouts, full-width inputs, inline receipt inspection (`< Back to Checks` header instead of modal sheets), and master-detail chat switching.
  - **Tablet (`768px–1139px`, `tablet: 768px`):** 2-column floor grid with a minimum `320px` card width (`~360px–450px` cards) so table titles and live timers never clip; comfortable modal sheets with `useVirtualKeyboard` bottom clearance (~32px buffer).
  - **Standard POS (`1140px–1439px`, `tablet-lg: 1024px` / `pos: 1180px`):** 3-column floor grid, 40/60 split-pane Checks History, persistent left Sidebar (`Sidebar.tsx`) and top `UnifiedCommandBar`.
  - **Large Desktop (`≥ 1440px`):** 4-column floor grid with full multi-pane Admin Back-Office telemetry.
- **Spacing Rhythm:** Base 4px unit with `12px` (`gap-3` / `p-3`) and `16px` (`gap-4` / `p-4`) standard gaps between interactive controls to prevent accidental miss-taps.

## Elevation & Depth

Surfaces are flat-by-default on Warm Sand (`#faf8f5`), using 1px–1.5px stone borders (`#e7e5e4`) and restrained ambient tinting (`0 3px 10px rgba(43, 15, 22, 0.05)` on floor cards, `0 1px 2px rgba(0, 0, 0, 0.10)` on command-bar action buttons) instead of heavy drop shadows. Active Ready tables add a tight semantic border (`2px solid #10b981`) and subtle green halo (`0 2px 6px rgba(16, 185, 129, 0.14)`).

### Named Rules

**The Tactile Press Rule.** Interactive cards and buttons confirm touch through subtle scale (`scale(0.98–0.985)`) and opacity (`0.85–0.92`) rather than heavy hover elevation.

## Shapes

Generous, approachable rounded rectangles (`12px` for inputs, chips, and primary buttons; `14px` for command-bar status pills; `20px` for Floor Table Cards) paired with `9999px` circular avatars and clear buttons. Modals and sheets use clean 1px–2px borders without nested card-inside-card clutter.

## Components

### Buttons

- **Shape:** Gently rounded hospitality corners (`12px` for primary/action buttons, `14px` for header pills).
- **Primary:** Solid Velvet Wine (`#810021`) or Wine Action (`#641b2a`) background with crisp white text (`#ffffff`), minimum `48px` height, `12px 16px` padding.
- **Pressed / Focus:** Subtle press compression (`scale(0.98)`, `opacity: 0.85`) without harsh default browser outline rings.
- **Secondary:** Pure White (`#ffffff`) surface, `1px–1.5px` Stone Border (`#e7e5e4`), Deep Charcoal text (`#1c1917`), minimum `48px` height.

### Chips

- **Style:** `12px–14px` radius pills (`#f9fafb` / `#ffffff` with `1px` border `#e7e5e4`), optional `7px` status dot, and `tabular-nums` count badge.
- **State:** Active state shifts to Deep Charcoal (`#1f2937`) or Velvet Wine (`#810021`) fill with white text; Event Mode toggle switches from white Cafe pill to solid Velvet Wine (`#810021`).

### Cards / Containers

- **Corner Style:** `20px` radius (`borderRadius: 20`) on `TableCard` floor tiles; `12px–16px` on admin and summary panels.
- **Background:** Crisp white (`#ffffff`) resting over Warm Sand (`#faf8f5`).
- **Shadow Strategy:** Flat-by-default with crisp `1px` borders (`#e7e5e4`)—no competing drop shadows or colored glow halos.
- **Border & Status:** `1px solid #e7e5e4` at rest; subtle `1px` semantic border (`border-emerald-300`, `border-amber-300`, `border-[#810021]/30`) paired with a leading status dot + `tabular-nums` timer pill.
- **Internal Padding:** `15px`–`16px` with clear horizontal divider (`rgba(0,0,0,0.06)`).

### Inputs / Fields (`TouchTextInput`)

- **Style:** `48px` minimum single-line height (`72px` multiline), `12px` radius, `1px` border (`#d6d3d1`) on white background (`#ffffff`), mandatory `16px` font size, and inline 1-tap `✕` clear button (`32px` hit target with `hitSlop={10}`).
- **Focus:** `border-[#800020]` (`#800020`) with soft 2px wine focus ring (`rgba(128, 0, 32, 0.20)`), zero native browser outline.
- **Error:** `border-rose-500` with soft rose ring and bold error copy below.

### Navigation (`Sidebar` & `UnifiedCommandBar`)

- **Tablet & Desktop (`≥ 768px`):** Quiet Warm Stone vertical rail (`#f3efea` with `1px` `#e7e5e4` border) using `#810021/10` active state (`Tables`, `FOH`, `Checks`, `Chat`, `Drawer`, `Printer`, `Alerts`, `Settings`) paired with `UnifiedCommandBar` (channel/status dropdowns, search, `+ New Order`, Cafe/Event mode switch, Hardware Station pill, and Staff chip).
- **Mobile (`< 768px`):** Fixed Bottom Navigation Bar with 4 primary tabs (`Tables`, `FOH`, `Checks`, `Chat` — or `Board`, `Tables`, `Checks`, `Chat` in KDS mode) + `"More"` bottom sheet (`Drawer`, `Printer`, `Alerts`, `Station Settings`, `Admin`, `Switch Staff / Lock`), paired with a slim 2-row `UnifiedCommandBar` (Row 1: Search + `+ New`; Row 2: horizontally scrollable filters + Mode toggle) and 1-column floor cards.

## Do's and Don'ts

### Do:

- **Do** enforce `min-h-[48px] min-w-[48px]` on every interactive `Pressable`, button, chip, tab, and input.
- **Do** keep every new or modified text element and all form inputs at `≥ 16px` (`text-base` / `text-pos-base`).
- **Do** use React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) with NativeWind v4 `className` utilities for all new components and new elements inside existing files.
- **Do** keep floor and modal UI strictly within Velvet Wine (`#810021`), Warm Sand/White (`#faf8f5`/`#ffffff`), and Deep Charcoal (`#1c1917`), reserving Emerald/Amber/Rose strictly for live status or alerts.
- **Do** preserve existing `StyleSheet.create` declarations and `*.styles.ts` files untouched (Isolated Hybrid rule).

### Don't:

- **Don't** rewrite or convert legacy `StyleSheet.create` files to NativeWind, or create new `*.styles.ts` files for new views.
- **Don't** use web DOM tags (`<div>`, `<span>`, `<button>`, `<input>`) in `frontend` TSX files.
- **Don't** use `text-xs`, `text-sm`, `text-pos-xs`, or `text-pos-sm` in new or modified views.
- **Don't** introduce purple/cyan gradients, glowing neon dark-mode clutter, nested card stacks, or public customer-facing KDS screens.
