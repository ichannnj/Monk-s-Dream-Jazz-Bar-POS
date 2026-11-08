# Blueprint 17: Orders Slices, Dispatch & Realtime Infrastructure

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/orders/application/channels.slice.ts` (617 LOC)
  - `frontend/src/features/shared/infrastructure/realtime.ts` (616 LOC)
  - `frontend/src/features/table-service/application/tableTab.slice.ts` (498 LOC)
  - `frontend/src/features/orders/application/hydration.slice.ts` (420 LOC)
  - `frontend/src/features/orders/application/realtime.slice.ts` (399 LOC)
  - `frontend/src/features/orders/data/dispatch.api.ts` (384 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/orders/application/takeoutOrderActions.ts` (`~275 LOC`)
   - Walk-in takeout order creation, ticket number generation, prepayed vs pay-on-pickup logic.
2. `frontend/src/features/orders/application/onlineDeliveryOrderActions.ts` (`~240 LOC`)
   - FoodPanda / GrabFood delivery order creation, courier name, tracking note handling.
3. `frontend/src/features/orders/application/channels.slice.ts` (`~150 LOC` Facade)
   - Order slice facade delegating off-premise actions to extracted action helpers.
4. `frontend/src/features/shared/infrastructure/realtime.types.ts` (`~115 LOC`)
   - Broadcast payload interfaces (`StationOrderPayload`, `TableOccupancyPayload`, `Auto86Payload`, `BuzzoutPayload`, `TableTransferPayload`).
5. `frontend/src/features/shared/infrastructure/realtimeChatChannel.ts` (`~215 LOC`)
   - Chat realtime channel subscription, presence tracking, broadcast chat message.
6. `frontend/src/features/shared/infrastructure/realtime.ts` (`~310 LOC` Facade)
   - RealtimeGateway core singleton managing postgres changes and global broadcast sync.
7. `frontend/src/features/table-service/application/tableTransferAndVoidActions.ts` (`~245 LOC`)
   - Table transfer RPC execution, round-aware item transfer, manager void confirmation actions.
8. `frontend/src/features/table-service/application/tableTab.slice.ts` (`~270 LOC` Facade)
   - Table tab state slice delegating complex transfer/void actions.
9. `frontend/src/features/orders/application/hydrationMappers.ts` (`~210 LOC`)
   - Order row to UI order state mappers and sorting logic.
10. `frontend/src/features/orders/application/hydration.slice.ts` (`~225 LOC` Facade)
    - Store hydration slice delegating mapper transformations.
11. `frontend/src/features/orders/application/realtimeNotificationHelpers.ts` (`~180 LOC`)
    - Web Audio sound triggers, floor notifications, station alerts formatting.
12. `frontend/src/features/orders/application/realtime.slice.ts` (`~235 LOC` Facade)
    - Realtime slice delegating notifications.
13. `frontend/src/features/orders/data/tabLifecycle.api.ts` (`~195 LOC`)
    - `ensureTab`, `getActiveOrders`, `resolveProductId`.
14. `frontend/src/features/orders/data/dispatch.api.ts` (`~205 LOC` Facade)
    - `createOrderWithItems`, `updateOrderItemStatus`, re-exports.

## Execution Steps

1. Decompose `channels.slice.ts` into takeout and delivery helpers.
2. Split `realtime.ts` into types, chat channel, and core gateway.
3. Split `tableTab.slice.ts`, `hydration.slice.ts`, and `realtime.slice.ts`.
4. Split `dispatch.api.ts` with `tabLifecycle.api.ts`.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/orders/application/*.ts \
     frontend/src/features/shared/infrastructure/realtime* \
     frontend/src/features/table-service/application/*.ts \
     frontend/src/features/orders/data/*.ts
pnpm sync:knowledge
```
