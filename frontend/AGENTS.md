# Frontend Agent Operating Guidelines — @monks/frontend

> **Global Navigation Pointer:** Read **[AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)** for system-wide routing and **[CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)** for domain rules.

## Architecture Invariants
- **Platform:** React Native (Expo SDK 52+) targeting touchscreen tablets (iPad / Android tablets).
- **Styling:** NativeWind v4 (`tailwindcss` 3.4). Use utility classes and React Native components (`View`, `Text`, `Pressable`). Do NOT install Tailwind v4 or standard web CSS frameworks.
- **Routing & Navigation:** **Role-based conditional switching in [App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx).**
  - **DO NOT** use Expo Router or create a `src/app/` directory. Screen switching is determined by `currentUser.role` in `useAuthStore`.
- **State Management:** Zustand stores located in `src/store/` ([useOrderStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useOrderStore.ts) and [useAuthStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useAuthStore.ts)).
- **Domain Types:** Import domain types from `src/types/` or `@monks/shared`, not from mock data files.

## Commands
```bash
pnpm --filter @monks/frontend web    # Start Expo web server (port 8081)
pnpm --filter @monks/frontend lint   # Lint code
```
