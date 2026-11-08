# Blueprint 06: Bill Settlement Modal Suite (`BillSettlementModal.tsx` + Styles + Slice)

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.tsx` (1,395 LOC)
  - `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.styles.ts` (704 LOC)
  - `frontend/src/features/checkout/application/settlement.slice.ts` (638 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.styles.ts` (`~240 LOC`)
   - Preserve main modal shell styles; component-specific styles moved with extracted components.
2. `frontend/src/features/checkout/presentation/bill-settlement/useBillSettlementController.ts` (`~285 LOC`)
   - Payment method state, cash tendered / change calculation, QR payment channel & ref validation.
   - Senior/PWD discount state & calculation integration (`taxAndDiscountCalculator.ts`).
   - Settlement submission handlers and confirmation triggers.
3. `frontend/src/features/checkout/presentation/bill-settlement/components/BillOrderSummaryPane.tsx` (`~255 LOC`)
   - Left-side bill preview, item checklist for senior discount eligibility, VAT / Service Charge breakdown.
4. `frontend/src/features/checkout/presentation/bill-settlement/components/BillPaymentMethodPane.tsx` (`~270 LOC`)
   - Payment method tabs (Cash, QR, Card, Comp), quick-cash buttons, numeric keypad.
5. `frontend/src/features/checkout/presentation/bill-settlement/components/BillQrPaymentSection.tsx` (`~235 LOC`)
   - Active QR channels, QR image display, 1-tap customer fullscreen scan trigger, 4-digit reference validation.
6. `frontend/src/features/checkout/presentation/bill-settlement/components/BillSeniorPwdDiscountSection.tsx` (`~240 LOC`)
   - Senior/PWD switch, OSCA/PWD ID, Cardholder Name, pax ratio selector, customer signature agreement.
7. `frontend/src/features/checkout/presentation/bill-settlement/components/BillConfirmSettlementDialog.tsx` (`~180 LOC`)
   - Final confirmation modal before tab close.
8. `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.tsx` (`~175 LOC` Facade/View Shell)
   - Coordinates controller and panes.
9. `frontend/src/features/checkout/application/settlementHelpers.ts` (`~245 LOC`)
   - Extracted thermal print job generator, VAT/SC payload mapper, cash drawer log mapper.
10. `frontend/src/features/checkout/application/offPremiseSettlement.ts` (`~185 LOC`)
    - Takeout prepaid and online delivery completion helpers.
11. `frontend/src/features/checkout/application/settlement.slice.ts` (`~235 LOC` Facade)
    - Re-exports clean Zustand slice delegating to helpers.

## Execution Steps

1. Refactor `BillSettlementModal.styles.ts` to retain only core shell layout.
2. Create `useBillSettlementController.ts` and component panes in `bill-settlement/components/`.
3. Extract `settlementHelpers.ts` and `offPremiseSettlement.ts` from `settlement.slice.ts`.
4. Refactor `BillSettlementModal.tsx` and `settlement.slice.ts` down to <250 LOC each.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.tsx \
     frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.styles.ts \
     frontend/src/features/checkout/presentation/bill-settlement/useBillSettlementController.ts \
     frontend/src/features/checkout/presentation/bill-settlement/components/*.tsx \
     frontend/src/features/checkout/application/settlement.slice.ts \
     frontend/src/features/checkout/application/settlementHelpers.ts \
     frontend/src/features/checkout/application/offPremiseSettlement.ts
pnpm sync:knowledge
```
