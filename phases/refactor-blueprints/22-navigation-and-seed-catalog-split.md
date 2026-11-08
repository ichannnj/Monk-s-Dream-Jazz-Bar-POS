# Blueprint 22: Navigation & Seed Catalog Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/shared/navigation/Sidebar.tsx` (428 LOC)
  - `frontend/src/features/menu/data/menu.mock.ts` (354 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/shared/navigation/SidebarProfileAndModeFooter.tsx` (`~195 LOC`)
   - Operating mode switch toggle pill, staff profile badge, switch staff / logout actions.
2. `frontend/src/features/shared/navigation/Sidebar.tsx` (`~245 LOC` Facade)
   - Brand logo header, navigation items list, delegating footer controls.
3. `frontend/src/features/menu/data/mock/menuDrinks.mock.ts` (`~185 LOC`)
   - Artisan coffees, cocktails, wines, and craft beverages seed data.
4. `frontend/src/features/menu/data/mock/menuFood.mock.ts` (`~175 LOC`)
   - Pastas, pizzas, appetizers, and dessert items seed data.
5. `frontend/src/features/menu/data/menu.mock.ts` (`~25 LOC` Facade)
   - `export const SEED_MENU_ITEMS: MenuItem[] = [...SEED_DRINKS, ...SEED_FOOD];`

## Execution Steps

1. Extract `SidebarProfileAndModeFooter.tsx` from `Sidebar.tsx`.
2. Split `menu.mock.ts` into drinks and food sub-catalogs, re-exporting unified list.
3. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/shared/navigation/Sidebar.tsx \
     frontend/src/features/shared/navigation/SidebarProfileAndModeFooter.tsx \
     frontend/src/features/menu/data/menu.mock.ts \
     frontend/src/features/menu/data/mock/*
pnpm sync:knowledge
```
