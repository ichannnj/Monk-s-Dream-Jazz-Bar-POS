# Blueprint 14: Thermal Printing & Hardware Station Suite

## Target & Metrics

- **Current Targets**:
  - `packages/printing/src/index.ts` (765 LOC)
  - `frontend/src/features/printer/services/escposBuilder.ts` (724 LOC)
  - `frontend/src/features/printer/presentation/HardwarePrintStationScreen.tsx` (642 LOC)
  - `frontend/src/features/printer/application/usePrinterStationStore.ts` (508 LOC)
  - `frontend/src/features/printer/services/webSerialPrinter.ts` (420 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `packages/printing/src/types.ts` (`~165 LOC`)
   - Interfaces: `CustomerReceiptPayload`, `RunnerChitPayload`, `TakeoutSlipPayload`, `DeliveryTagPayload`, `ThermalPrintJobPayload`, `IPrinterService`.
2. `packages/printing/src/formatters/receiptFormatter.ts` (`~260 LOC`)
   - Text layout, 48-column alignment, Philippine VAT & Senior discount formatting, ESC/POS byte generator for receipts.
3. `packages/printing/src/formatters/chitAndSlipFormatter.ts` (`~245 LOC`)
   - Formatting for runner chits, takeout bags, delivery tags, and X/Y/Z readings.
4. `packages/printing/src/index.ts` (`~185 LOC` Facade)
   - Re-exports types, formatters, `UsbEscPosPrinter`, and `MockPrinter`.
5. `frontend/src/features/printer/services/escpos/escposCore.ts` (`~205 LOC`)
   - Command constants `ESCPOS`, text alignment, cut commands, drawer kick bytes, formatting primitives.
6. `frontend/src/features/printer/services/escpos/receiptBytesBuilder.ts` (`~235 LOC`)
   - `buildReceiptBytes` with bitonal logo rendering and VAT breakdown.
7. `frontend/src/features/printer/services/escpos/chitAndReadingBytesBuilder.ts` (`~285 LOC`)
   - `buildRunnerChitBytes`, `buildTakeoutSlipBytes`, `buildDeliveryTagBytes`, `buildReadingSlipBytes`.
8. `frontend/src/features/printer/services/escposBuilder.ts` (`~45 LOC` Facade)
   - Barrel export delegating to `escpos/` modules.
9. `frontend/src/features/printer/services/webUsbTransport.ts` (`~210 LOC`)
   - WebUSB request device, endpoint claim, and bulk transfer binary transmission.
10. `frontend/src/features/printer/services/webSerialPrinter.ts` (`~225 LOC` Facade)
    - Re-exports WebSerial/WebUSB printer service singleton delegating low-level USB methods.
11. `frontend/src/features/printer/application/printerTestPayloads.ts` (`~215 LOC`)
    - Test runner chit, test customer receipt, and mock job factory payloads.
12. `frontend/src/features/printer/application/usePrinterStationStore.ts` (`~295 LOC` Facade)
    - Zustand store managing connection status, Web Locks leader election, and queue processing.
13. `frontend/src/features/printer/presentation/components/PrinterTelemetryHeaderAndControls.tsx` (`~245 LOC`)
    - Device status badge, connect button, test print triggers, drawer kick test.
14. `frontend/src/features/printer/presentation/components/PrinterJobQueueAndLogsPane.tsx` (`~255 LOC`)
    - Realtime incoming print jobs list, reprint triggers, error telemetry logs.
15. `frontend/src/features/printer/presentation/HardwarePrintStationScreen.tsx` (`~180 LOC` View Shell)
    - Coordinates header controls and job queue pane.

## Execution Steps

1. Refactor `packages/printing/src/index.ts` into types, formatters, and facade.
2. Decompose `escposBuilder.ts` into core, receipt, and chit/reading builders.
3. Extract `webUsbTransport.ts` from `webSerialPrinter.ts`.
4. Extract test payloads from `usePrinterStationStore.ts`.
5. Split `HardwarePrintStationScreen.tsx` into header and queue components.
6. Run verification gates.

## Verification Gate

```bash
pnpm --filter @monks-dream/printing build
pnpm --filter frontend exec tsc --noEmit
wc -l packages/printing/src/*.ts packages/printing/src/formatters/* \
     frontend/src/features/printer/services/escposBuilder.ts \
     frontend/src/features/printer/services/escpos/* \
     frontend/src/features/printer/services/webSerialPrinter.ts \
     frontend/src/features/printer/services/webUsbTransport.ts \
     frontend/src/features/printer/application/* \
     frontend/src/features/printer/presentation/HardwarePrintStationScreen.tsx \
     frontend/src/features/printer/presentation/components/*
pnpm sync:knowledge
```
