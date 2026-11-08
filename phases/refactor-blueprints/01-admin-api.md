# Blueprint 01: Admin API (`admin.api.ts`) Decomposition

## Target & Metrics

- **Current Target**: `frontend/src/features/admin/data/admin.api.ts` (1,827 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/data/admin.types.ts` (`~245 LOC`)
   - Move all admin data types, payload interfaces, constants (`PH_MINIMUM_WAGE_DAILY`), and enums.
2. `frontend/src/features/admin/data/api/venueSettings.api.ts` (`~135 LOC`)
   - Functions: `getLatest6AmCutoff`, `getManilaBusinessDateString`, `getMsUntilNext6Am`
   - Object: `venueSettingsApi` (`getVenueSettings`, `setOperatingMode`, `updateVenueSettings`)
3. `frontend/src/features/admin/data/api/catalogProducts.api.ts` (`~255 LOC`)
   - Object: `catalogProductsApi` (`getCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `getProductsWithBOM`, `upsertProductVariants`, `createProduct`, `updateProduct`, `deleteProduct`, `toggleAuto86`, `saveProductBOM`)
4. `frontend/src/features/admin/data/api/catalogModifiers.api.ts` (`~205 LOC`)
   - Object: `catalogModifiersApi` (`getModifierGroups`, `createModifierGroup`, `updateModifierGroup`, `deleteModifierGroup`, `saveProductModifier`, `getCatalogModifiers`, `upsertProductModifiers`, `deleteProductModifier`)
5. `frontend/src/features/admin/data/api/inventoryStock.api.ts` (`~250 LOC`)
   - Object: `inventoryStockApi` (`getSuppliers`, `createSupplier`, `updateSupplier`, `deleteSupplier`, `getInventoryItems`, `createInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `restockDelivery`, `quickAdjustStock`, `updateParLevel`, `logWaste`, `getStockMovements`, `submitStocktakeAudit`)
6. `frontend/src/features/admin/data/api/attendancePayroll.api.ts` (`~155 LOC`)
   - Object: `attendancePayrollApi` (`getAttendanceRecords`, `adminUpsertAttendance`, `updateDiscretionaryAddon`)
7. `frontend/src/features/admin/data/api/staffRoster.api.ts` (`~295 LOC`)
   - Object: `staffRosterApi` (`getStaffRoster`, `createStaffUser`, `createNonWorkflowStaff`, `updateStaffMember`, `resetAdminPassword`, `resetStaffPin`, `toggleStaffStatus`)
8. `frontend/src/features/admin/data/api/salesAndTables.api.ts` (`~285 LOC`)
   - Object: `salesAndTablesApi` (`getSalesOverview`, `getTables`, `createTable`, `updateTable`, `deleteTable`, `releaseTable`, `resetStationMetrics`, `clearStationMetricsReset`)
9. `frontend/src/features/admin/data/admin.api.ts` (`~95 LOC` Facade)
   - Re-exports everything from `admin.types.ts`
   - Re-exports date helpers from `venueSettings.api.ts`
   - Composes `export const adminApi = { ...venueSettingsApi, ...catalogProductsApi, ...catalogModifiersApi, ...inventoryStockApi, ...attendancePayrollApi, ...staffRosterApi, ...salesAndTablesApi };`

## Execution Steps

1. Create `admin.types.ts` and verify imports from `@monks-dream/shared`.
2. Create each sub-api module under `frontend/src/features/admin/data/api/`.
3. Update `admin.api.ts` to re-export types, helper functions, and the unified `adminApi` object.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/data/admin.api.ts frontend/src/features/admin/data/admin.types.ts frontend/src/features/admin/data/api/*.ts
pnpm sync:knowledge
```
