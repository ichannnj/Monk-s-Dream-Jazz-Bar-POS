# 🔬 Technical Guide: Supabase Setup, Database Branching & Operational Architecture

> **Repository:** Monk's Dream Jazz Bar POS  
> **Topic:** Comprehensive guide for Supabase local/cloud setup, Database Branching, Monorepo integration, and seamless project execution.  
> **Target Audience:** Engineering Leads, POS Developers, Systems Architects.  
> **Output Location:** `docs/research-supabase-setup-branching-guide.md`  
> **Date:** October 18, 2026  

---

## Executive Summary

The **Monk's Dream Jazz Bar POS** utilizes **pure Supabase Backend-as-a-Service (BaaS)** as its central operational backbone. By leveraging PostgreSQL as both the relational data store and the real-time event broker, the system eliminates traditional intermediate containerized web servers (such as NestJS).

This technical guide provides the operational manual for:
1. Understanding how Supabase powers this POS system (Auth RPCs, Realtime channels, atomic stored procedures, and storage).
2. Setting up both **Local Docker-based** and **Remote Cloud-based** Supabase environments.
3. Managing **Database Branching** (Git-integrated preview branches, persistent staging branches, and CLI commands).
4. Running the daily development loop (migrations, seeding, TypeScript type generation, frontend client linking).
5. Avoiding common architectural and runtime pitfalls.

---

## 1. How Supabase is Used in This Project

The POS monorepo integrates Supabase directly across four primary subsystems:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         MONK'S DREAM POS — SUPABASE ARCHITECTURE                       │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Client / Subsystem             │ Supabase BaaS Primitive & Responsibility              │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Handheld Tablets (Expo / RN)   │ • @supabase/supabase-js Client                        │
│ • Waiter Floor POS             │ • Stored Procedure: authenticate_staff_pin (4-digit)  │
│ • Cashier Checkout             │ • Postgres Changes: live table occupancy updates      │
│ • Barista / Kitchen KDS        │ • Realtime Channels: station-filtered drink/food items │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Inventory & Order Engine       │ • PostgreSQL Stored Function:                         │
│ (Atomic In-Database Logic)     │   dispatch_order_with_depletion                       │
│                                │ • Row-Level Locking (SELECT ... FOR UPDATE)           │
│                                │ • Auto-86 Item Triggering                             │
│                                │ • Immutable stock_movements ledger                    │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Local USB Printing Station     │ • Realtime Channel listener on print_jobs table       │
│ (@monks/printing)              │ • Automatic status update (PENDING -> COMPLETED)      │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Menu Media & Catalog           │ • Supabase Storage Bucket: menu-images                │
│                                │ • Public CDN URLs for high-res food/drink photos      │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

### 1.1 Authentication: 4-Digit Staff PIN RPC
Standard Supabase Auth (Email/Password, Magic Link, OAuth) does not fit a high-speed jazz club where floor staff clock in or unlock shared tablets in under a second. Instead, authentication uses a PostgreSQL `SECURITY DEFINER` function:

* **Stored Procedure:** `public.authenticate_staff_pin(p_pin TEXT)` defined in [supabase/migrations/20261017000000_init_pos_schema.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql#L318-L345).
* **Client Invocation:** Handled in [frontend/src/services/api.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/api.ts#L9-L37):
  ```typescript
  const { data, error } = await supabase.rpc('authenticate_staff_pin', {
    p_pin: pin,
  });
  ```
* **Offline Resilience:** If the network is unreachable, `posApi` falls back to `SEED_STAFF_USERS` to prevent floor lockouts.

### 1.2 Realtime Station Routing (Barista & Kitchen KDS)
Tablet screens do not poll the database. Instead, they subscribe to changes on the `order_items` table:
* **Bar Station:** Subscribes with filter `station_target=eq.bar`.
* **Kitchen Station:** Subscribes with filter `station_target=eq.kitchen`.
* **Floor Tables:** Subscribes to `public.tables` to reflect `Empty`, `Occupied`, or `Billed` status instantaneously across all handhelds.
* **Publication Config:** Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE ...` in the initial migration.

### 1.3 Atomic Depletion & Concurrency Control
When an order is dispatched to preparation, inventory depletion must occur with ACID guarantees:
* **Procedure:** `dispatch_order_with_depletion(p_order_id UUID)`
* **Mechanics:** Iterates through recipe Bill of Materials (BOMs), locks row via `UPDATE public.inventory_items`, creates an immutable `stock_movements` record, and automatically sets `auto_86 = true` on the product if stock reaches zero.

### 1.4 ESC/POS Thermal Printing Daemon
A lightweight Node.js daemon running on the counter PC uses `@monks/printing` to drive the physical `/dev/usb/lp0` thermal printer by subscribing to newly inserted rows in `public.print_jobs`.

---

## 2. Step-by-Step Setup Guide

### 2.1 Prerequisites
* **Node.js:** v20.x or higher
* **Package Manager:** `pnpm` (v9+)
* **Docker Engine / Docker Desktop:** Running (required only for local Supabase emulation)
* **Supabase CLI:** Version 2.121.0+ (`npx supabase`)

---

### 2.2 Option A: Local Development Setup (Recommended for Offline/Fast Iteration)

Running Supabase locally spins up isolated Docker containers for PostgreSQL (Postgres 17), GoTrue Auth, Realtime, PostgREST API, Storage, and Supabase Studio.

#### 1. Start Local Supabase
From the repository root:
```bash
pnpm supabase:start
# or: npx supabase start
```
*Tip: On first run, Docker will download the Supabase images. Ensure Docker Desktop or dockerd is running.*

Once running, the CLI outputs local service endpoints:
* **Studio URL:** `http://localhost:54323` (Web interface for SQL Editor, Table Editor, and Logs)
* **API URL:** `http://localhost:54321`
* **DB URL:** `postgresql://postgres:postgres@localhost:54322/postgres`
* **Publishable Anon Key:** Displayed in the terminal output
* **Service Role Key:** Displayed in the terminal output

#### 2. Apply Migrations & Seed Data
```bash
# Re-runs all migrations from supabase/migrations/ and populates supabase/seed.sql
pnpm supabase:reset
# or: npx supabase db reset
```

#### 3. Stop Local Supabase
```bash
pnpm supabase:stop
# or: npx supabase stop
```

---

### 2.3 Option B: Remote / Supabase Cloud Setup

To connect to a hosted Supabase Cloud project:

#### 1. Authenticate with Supabase Cloud
```bash
npx supabase login
```
This opens your browser to generate a personal access token.

#### 2. Link Repository to Your Remote Project
Retrieve your Project Reference ID from the Supabase Dashboard URL (`https://supabase.com/dashboard/project/<project-ref>`):
```bash
npx supabase link --project-ref <your-project-ref>
```

#### 3. Push Migrations to Supabase Cloud
```bash
pnpm supabase:push
# or: npx supabase db push
```

#### 4. Run Seed Data in Cloud
You can run `supabase/seed.sql` either:
* Directly via the Supabase Cloud SQL Editor (copy and paste [supabase/seed.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/seed.sql)), or
* Via the CLI against the linked database:
  ```bash
  npx supabase db execute --file ./supabase/seed.sql
  ```

---

### 2.4 Strongly-Typed TypeScript Synchronization

Whenever tables, columns, enums, or RPC stored procedures are added or modified, regenerate TypeScript definitions to keep `@monks/shared` in lockstep:

```bash
# If using linked Supabase Cloud project:
pnpm supabase:types

# If developing against local Supabase Docker instance:
npx supabase gen types typescript --local > packages/shared/src/database.types.ts
```

Then verify compile-time type safety across the entire monorepo:
```bash
pnpm build
```

---

### 2.5 Configuring Frontend Environment Variables

Create or update [frontend/.env](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/.env) (referencing [frontend/.env.example](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/.env.example)):

#### For Local Supabase Development:
```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-start>
```
*(Note: If testing on a physical tablet device over Wi-Fi, replace `localhost` with your workstation's LAN IP, e.g. `http://192.168.1.50:54321`).*

#### For Hosted Supabase Cloud:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-cloud-anon-key>
```

#### Start the Expo Application:
```bash
# Clear Metro cache when modifying .env files:
pnpm --filter @monks/frontend start -c
```

---

## 3. How Supabase Database Branching Works

Database Branching allows teams to create isolated, disposable copies of the database schema, functions, configuration, and storage to test features, run migrations safely, and collaborate without stepping on production data.

```
                    ┌────────────────────────┐
                    │   Production Project   │
                    │      (main branch)     │
                    └───────────┬────────────┘
                                │
               ┌────────────────┴────────────────┐
               │                                 │
     (Git PR opened)                     (Manual / Staging)
               ▼                                 ▼
   ┌───────────────────────┐         ┌───────────────────────┐
   │ Ephemeral Preview DB  │         │ Persistent Staging DB │
   │ (feat/phase-2-kds)    │         │ (staging branch)      │
   └───────────────────────┘         └───────────────────────┘
```

### 3.1 Branching Modes: Ephemeral vs. Persistent

1. **Ephemeral Preview Branches (Pull Request Driven):**
   * Automatically provisioned when a Pull Request is opened on GitHub.
   * Supabase applies all pending migrations from `supabase/migrations/` onto a newly provisioned database.
   * Gets torn down automatically when the PR is merged or closed.
2. **Persistent Branches (Staging / Testing):**
   * Long-lived isolated environments created with the `--persistent` flag.
   * Useful for a permanent staging environment where QA or venue staff test upcoming releases.

---

### 3.2 Supabase CLI Branching Command Reference

The Supabase CLI manages remote branches via the `supabase branches` command family:

| Action | Command | Purpose |
|---|---|---|
| **Create Preview Branch** | `supabase branches create feat/phase-2-depletion` | Creates an ephemeral branch for feature testing. |
| **Create Persistent Branch** | `supabase branches create staging --persistent` | Creates a permanent staging branch. |
| **Clone with Production Data** | `supabase branches create test-audit --with-data` | Clones production database contents into the branch. |
| **List All Active Branches** | `supabase branches list` | Displays branch IDs, git refs, and status. |
| **Get Branch Details** | `supabase branches get <branch-name-or-id>` | Inspects connection strings, status, and region. |
| **Pause an Idle Branch** | `supabase branches pause <branch-name-or-id>` | Suspends compute to conserve organization quota. |
| **Resume a Branch** | `supabase branches unpause <branch-name-or-id>` | Restores the branch compute instance. |
| **Delete a Branch** | `supabase branches delete <branch-name-or-id>` | Permanently destroys the branch instance. |

*Primary Source Citation:* [Supabase CLI Branching Reference](https://supabase.com/docs/reference/cli/supabase-branches-create).

---

### 3.3 GitHub Integrated Branching Workflow

For teams utilizing GitHub with Supabase Cloud:

1. **Enable GitHub Integration:**
   * In the Supabase Dashboard, navigate to **Project Settings $\to$ Integrations $\to$ GitHub**.
   * Link the repository `Monk-s-Dream-Jazz-Bar-POS` and designate `main` as the production branch.
2. **Create Local Feature Branch:**
   ```bash
   git checkout -b feat/phase-2-realtime-depletion
   ```
3. **Develop & Create Migrations Locally:**
   ```bash
   # Create a new numbered migration file:
   npx supabase migration new add_depletion_triggers
   ```
4. **Push and Open PR:**
   ```bash
   git push origin feat/phase-2-realtime-depletion
   ```
   * Result: Supabase GitHub Action detects the PR, spins up a dedicated preview database, applies migrations, and comments on the PR with the branch preview URL and credentials.
5. **Merge to Production:**
   * Merging the PR into `main` automatically triggers the migration run on the Production Supabase database.

---

### 3.4 Managing `config.toml` Declarative Configuration

Supabase configurations (Auth, Storage, Realtime, API limits) are version-controlled in [supabase/config.toml](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/config.toml).
* Changes made to `config.toml` in `main` automatically propagate to all preview branches upon creation.
* To target specific remote branches for seeding or overrides, add remote blocks:
  ```toml
  [remotes.staging]
  project_id = "your-staging-project-ref"

  [remotes.staging.db.seed]
  enabled = true
  sql_paths = ["./supabase/seed.sql"]
  ```

---

## 4. Operational Invariants for Seamless Execution

To ensure friction-free development and maintain system integrity, adhere to these project invariants:

### 1. Migrations are Strictly Append-Only
* **Never edit historical migrations:** Once a migration has been pushed to a remote environment or applied on teammates' machines, never modify the file.
* **Generate new migrations for changes:**
  ```bash
  npx supabase migration new fix_inventory_trigger
  ```
* Write reversible or safe idempotent DDL statements (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).

### 2. TypeScript Types Must Match Schema
* Whenever you add or alter an SQL migration:
  ```bash
  pnpm supabase:types
  pnpm build
  ```
* All domain schemas and application state interfaces in `frontend` must derive from `@monks/shared` (which re-exports `database.types.ts`). **Never define ad-hoc interfaces or import types from mock files.**

### 3. Supabase Realtime Publication Checklist
* If you introduce a new table that must stream live updates to tablets or the printer:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.new_table;
  ```
* For tables where frontend clients need full payload details on `UPDATE` or `DELETE` events, set replica identity:
  ```sql
  ALTER TABLE public.new_table REPLICA IDENTITY FULL;
  ```

### 4. Staff PIN Security Definer Guardrails
* All custom PL/pgSQL stored procedures handling staff authorization (`authenticate_staff_pin`) or transactional inventory updates must:
  1. Specify `SECURITY DEFINER`.
  2. Explicitly set `SET search_path = public` to mitigate search-path escalation attacks.
  3. Validate `is_active = true` for staff accounts.

### 5. Expo Public Environment Variables & Caching
* Expo web and tablet bundlers embed environment variables at build/bundle time.
* Every variable accessed on the client MUST be prefixed with `EXPO_PUBLIC_` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
* If you alter `.env`, restart the Metro bundler with cache clearing:
  ```bash
  pnpm --filter @monks/frontend start -c
  ```

---

## 5. Primary Sources & Official References

1. **Supabase Local Development & CLI:**  
   [https://supabase.com/docs/guides/local-development/cli/getting-started](https://supabase.com/docs/guides/local-development/cli/getting-started)
2. **Supabase Database Branching Guide:**  
   [https://supabase.com/docs/guides/platform/branching](https://supabase.com/docs/guides/platform/branching)
3. **Supabase CLI Branching Reference (`supabase branches`):**  
   [https://supabase.com/docs/reference/cli/supabase-branches-create](https://supabase.com/docs/reference/cli/supabase-branches-create)
4. **Supabase TypeScript Generation:**  
   [https://supabase.com/docs/guides/database/typescript-support](https://supabase.com/docs/guides/database/typescript-support)
5. **Supabase Realtime (Postgres CDC & Broadcast):**  
   [https://supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime)
6. **Supabase Database Functions (RPC) & Security Definer:**  
   [https://supabase.com/docs/guides/database/functions](https://supabase.com/docs/guides/database/functions)
7. **Supabase Storage JavaScript SDK:**  
   [https://supabase.com/docs/reference/javascript/storage-from-upload](https://supabase.com/docs/reference/javascript/storage-from-upload)
8. **Expo Environment Variables:**  
   [https://docs.expo.dev/guides/environment-variables/](https://docs.expo.dev/guides/environment-variables/)
