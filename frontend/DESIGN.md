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

<!-- impeccable:design-map -->

Name: Monk's Dream Jazz Bar POS
Colors: primary: velvet-wine #810021; secondary: brass-accent #b48a3c; tertiary: ready-emerald #10b981; neutral: warm-sand #faf8f5; primary: wine-action #641b2a; primary: admin-primary #6e1d2c (+10 more in the sidecar)
Fonts: Raconteur NF (display); Plus Jakarta Sans (headline, title, body, label)
Spacing: sm 8px, md 12px, lg 16px, xl 24px
Radius: md 12px, lg 14px, xl 20px, full 9999px
North Star: "The Velvet Ledger"
Rules:

- The Three-Color Floor Rule. Floor and modal surfaces rely solely on Warm Sand/White surfaces, Deep Charcoal typography, and Velvet Wine emphasis; semantic Emerald/Amber/Rose appear strictly for live prep status, errors, or offline warnings.
- The 16px Anti-Zoom Floor Rule. Every text element and form input in new or modified views must be at least `16px` (`text-base` / `text-pos-base`).
- The Tabular Numerals Rule. All timers, currency amounts (`₱`), table counts, and receipt lines inherit `font-variant-numeric: tabular-nums` so numbers never jitter during live updates.
- The Tactile Press Rule. Interactive cards and buttons confirm touch through subtle scale (`scale(0.98–0.985)`) and opacity (`0.85–0.92`) rather than heavy hover elevation.
  Don't:
- Don't rewrite or convert legacy `StyleSheet.create` files to NativeWind, or create new `*.styles.ts` files for new views.
- Don't use web DOM tags (`<div>`, `<span>`, `<button>`, `<input>`) in `frontend` TSX files.
- Don't use `text-xs`, `text-sm`, `text-pos-xs`, or `text-pos-sm` in new or modified views.
- Don't introduce purple/cyan gradients, glowing neon dark-mode clutter, nested card stacks, or public customer-facing KDS screens.
  Do:
- Do enforce `min-h-[48px] min-w-[48px]` on every interactive `Pressable`, button, chip, tab, and input.
- Do keep every new or modified text element and all form inputs at `≥ 16px` (`text-base` / `text-pos-base`).
- Do use React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) with NativeWind v4 `className` utilities for all new components and new elements inside existing files.
- Do keep floor and modal UI strictly within Velvet Wine (`#810021`), Warm Sand/Muted Stone (`#faf8f5`/`#f5f5f5`), and Deep Charcoal (`#1c1917`), reserving Emerald/Amber/Rose strictly for live status or alerts.
- (+1 more)
  Full: .impeccable/design-full.md (read a section when you need its detail)
