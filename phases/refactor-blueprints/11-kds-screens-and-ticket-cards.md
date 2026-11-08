# Blueprint 11: KDS Screens & Ticket Cards Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/kds/presentation/barista/components/BaristaTicketCard.tsx` (786 LOC)
  - `frontend/src/features/kds/presentation/barista/modals/FohStatusModal.tsx` (414 LOC)
  - `frontend/src/features/kds/presentation/common/UnifiedKdsScreen.tsx` (398 LOC)
  - `frontend/src/features/kds/presentation/common/hooks/useKdsTickets.ts` (363 LOC)
  - `frontend/src/features/kds/presentation/foh-runner/components/RunnerTicketCard.tsx` (356 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/kds/presentation/common/hooks/kdsTicketMapper.ts` (`~175 LOC`)
   - Ticket grouping, station filtering, elapsed time sorting.
2. `frontend/src/features/kds/presentation/common/hooks/useKdsTickets.ts` (`~205 LOC` Facade)
   - Realtime ticket subscription and state hook delegating to mapper.
3. `frontend/src/features/kds/presentation/barista/components/BaristaTicketCard.styles.ts` (`~195 LOC`)
   - Ticket card container, status borders, timer badges styles.
4. `frontend/src/features/kds/presentation/barista/components/BaristaTicketHeader.tsx` (`~210 LOC`)
   - Order number, table/takeout tag, elapsed timer pill, action buttons.
5. `frontend/src/features/kds/presentation/barista/components/BaristaTicketItemRow.tsx` (`~245 LOC`)
   - Individual item row, modifiers, preparation toggle, bump bar feedback.
6. `frontend/src/features/kds/presentation/barista/components/BaristaTicketCard.tsx` (`~190 LOC` Facade)
   - Composes header and item rows.
7. `frontend/src/features/kds/presentation/barista/modals/FohStatusTableGrid.tsx` (`~195 LOC`)
   - Table grid layout and occupancy indicators for FOH status.
8. `frontend/src/features/kds/presentation/barista/modals/FohStatusModal.tsx` (`~235 LOC`)
   - Modal container and summary status bar.
9. `frontend/src/features/kds/presentation/foh-runner/components/RunnerTicketItemRow.tsx` (`~145 LOC`)
   - Item check row for expediter tray dispatch.
10. `frontend/src/features/kds/presentation/foh-runner/components/RunnerTicketCard.tsx` (`~225 LOC`)
    - Runner card shell delegating item rendering.
11. `frontend/src/features/kds/presentation/common/useKdsWorkstationController.ts` (`~180 LOC`)
    - Station heartbeat reporting, audio chime trigger, active tab filter.
12. `frontend/src/features/kds/presentation/common/UnifiedKdsScreen.tsx` (`~235 LOC`)
    - Station screen layout coordinating board, checks, chat, and alerts.

## Execution Steps

1. Decompose `useKdsTickets.ts` into mapper and hook.
2. Split `BaristaTicketCard.tsx` into header, items, styles, and card shell.
3. Split `FohStatusModal.tsx` and `RunnerTicketCard.tsx`.
4. Extract KDS workstation controller from `UnifiedKdsScreen.tsx`.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/kds/presentation/barista/components/* \
     frontend/src/features/kds/presentation/barista/modals/* \
     frontend/src/features/kds/presentation/common/UnifiedKdsScreen.tsx \
     frontend/src/features/kds/presentation/common/useKdsWorkstationController.ts \
     frontend/src/features/kds/presentation/common/hooks/* \
     frontend/src/features/kds/presentation/foh-runner/components/*
pnpm sync:knowledge
```
