# Frontend Agent Operating Guidelines — @monks/frontend

> **Global Navigation Pointer:** Read **[AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)** for system-wide routing and **[CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)** for domain rules.

## Architecture Invariants

- **Platform:** React Native (Expo SDK 52+) targeting touchscreen tablets (iPad / Android tablets).
- **Styling Mandate (NativeWind v4):**
  - **New Views & Components:** Must use 100% NativeWind v4 (`className="..."`). Do NOT create new `*.styles.ts` or new `StyleSheet.create` blocks.
  - **Preservation of Existing Views (Zero Regressions):** Do NOT convert, refactor, or delete existing `StyleSheet.create` code or `*.styles.ts` files in already-built views. When modifying or adding features to an existing view, apply NativeWind `className` strictly to the newly added JSX elements/subcomponents (Isolated Hybrid).
  - **Persistent Rule Reference:** Follow all rules in **[.agents/rules/nativewind-tablet-standards.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/rules/nativewind-tablet-standards.md)**.
- **Tablet Typography Standards (≥ 16px Floor):**
  - Strict minimum font size of **16px** (`text-base` / `text-pos-base`) across **ALL** text elements, including status badges, chips, tags, inputs, and timestamps.
  - **Forbidden:** Never use `text-xs`, `text-sm`, `text-pos-xs` (14px), or `text-pos-sm` (15px) in any new or modified view.
  - Scale headers and key metrics appropriately (`text-pos-md` [18px], `text-pos-lg` [20px], `text-pos-xl` [24px], `text-pos-2xl` [28px]).
- **Tablet Ergonomics & Touch Targets (≥ 48px):**
  - All interactive elements (`Pressable`, button, card, input, tab, keypad key) must have a minimum touch dimension of **48px** (`min-h-[48px] min-w-[48px]` or `min-h-touch-md min-w-touch-md`).
- **Responsive Layout Strategy:**
  - Build responsive layouts using Tailwind breakpoints: mobile (<768px stacked), tablet (≥768px `tablet:` 2–3 column grids), and POS (≥1024px `tablet-lg:` / `pos:` split panes).
- **Component Purity:** Web DOM elements (`<div>`, `<span>`, `<button>`, `<input>`) are **strictly forbidden** and caught by ESLint `no-restricted-syntax`. Use React Native primitives exclusively (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`).
- **Routing & Navigation:** **Role-based conditional switching in [App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx).**
  - **DO NOT** use Expo Router or create a `src/app/` directory. Screen switching is determined by `currentUser.role` in `useAuthStore`.
- **State Management:** Zustand stores located in `src/store/` ([useOrderStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useOrderStore.ts) and [useAuthStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useAuthStore.ts)).
- **Domain Types:** Import domain types from `src/types/` or `@monks/shared`, not from mock data files.
- **Data Boundary:** Never import `mockData.ts` or `src/mock/*` inside `src/services/*`.

## Commands

```bash
pnpm --filter @monks/frontend web        # Start Expo web server (port 8081)
pnpm --filter @monks/frontend typecheck  # Typecheck frontend (tsc --noEmit)
pnpm --filter @monks/frontend lint       # Lint frontend code (ESLint 9 Flat Config)
pnpm --filter @monks/frontend lint:fix   # Auto-fix linting issues
```
