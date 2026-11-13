# 🎷 Monk's Dream Jazz Bar POS — Production Hardening & Operational Roadmap

> **Standard:** Matt Pocock TypeScript Engineering Principles (Zero `any`, Discriminated Unions, Strict Invariant Encodings, TDD Red-Green-Refactor, Deep Module Boundaries).  
> **Master Tracker:** Tracks the execution of the 6 production hardening phases agreed upon with stakeholders.

---

## 🗺️ Master Progress Board

- [ ] **[Phase 1: Durable Offline Storage & Resilient Mutation Replay Engine](phase-1-durable-offline-storage.md)**
      _Durable queue in localStorage with safe polyfill, idempotent mutation keys, retry drainer with exponential backoff, and local snapshot caching instead of static mock seeds._
- [ ] **[Phase 2: Split-Tender Settlement & Multi-Payment Checkout](phase-2-split-tender-settlement.md)**
      _Multi-tender checkout (Cash + GCash/Card/QRPH), atomic PostgreSQL cascade creating multiple payment rows linked to the same tab, cash drawer allocation, and itemized 80mm ESC/POS receipts._
- [ ] **[Phase 3: Type-Level Hardening (Matt Pocock Spec) & Vitest Test Harness](phase-3-testing-and-type-hardening.md)**
      _Install Vitest, eliminate 1,000+ ESLint warnings and any types, add "type": "module" in frontend package.json, and write full test suites for billing, senior/PWD discounts, and queue draining._
- [ ] **[Phase 4: Code-Splitting, Lazy-Loading & Scoped Realtime Subscriptions](phase-4-code-splitting-and-scoped-realtime.md)**
      _React.lazy() on Admin Back-Office, Event Calendar, Hardware Station, and Timeclock Kiosk. Dynamically import heavy Excel workbooks. Scope Supabase Realtime CDC to authenticated sessions._
- [ ] **[Phase 5: Hospitality KDS Operations ('Hold & Fire' + Recall)](phase-5-hospitality-kds-operations.md)**
      _Course timing (per-item 'Hold' pill + 1-tap 'Hold All Food'), database migration for order_items.is_held, KDS paused queue with FIRE button, and 15-second KDS Undo Bump recall buffer._
- [ ] **[Phase 6: Hardware Print Station Telemetry & Security Hardening](phase-6-hardware-telemetry-and-security.md)**
      _ESC/POS WebUSB/Serial paper-out/jam telemetry status feed to station_status, 30s lockout after 5 failed PIN attempts, and immutable supervisor override audit logging._
