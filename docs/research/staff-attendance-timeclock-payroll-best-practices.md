# Hospitality POS Timeclock Kiosk, Attendance Ledger & Prime Cost Payroll Best Practices

> **Research Scope:** Architectural, security, labor-compliance, and financial-accounting best practices for implementing a dedicated **Staff Timeclock Kiosk (`?mode=timeclock`)**, separating the **Staff Directory & Credentials (`public.users`)** from the **Timeclock & Payroll Ledger (`public.attendance_records`)**, enforcing `pgcrypto` bcrypt PIN verification for both POS workflow staff and non-POS venue personnel, and integrating live labor costs into **Prime Cost** (`COGS + Total Labor`) and **Labor Cost Percentage** across **Monk's Dream Jazz Bar POS**.  
> **Primary Sources Consulted:**
>
> - [Toast POS Central — Setting Up & Using the Toast Time Clock (POS Access Codes for All Employees)](https://central.toasttab.com/s/article/Setting-Up-and-Using-the-Time-Clock)
> - [Square Support Center — Get Started with Team Management, Personal Passcodes & Square Shifts Timecards](https://squareup.com/help/us/en/article/6396-get-started-with-team-management)
> - [Lightspeed Restaurant K-Series Support — Configuring POS Users, PIN Codes & Timeclock Punches](https://k-series-support.lightspeedhq.com/)
> - [Department of Labor and Employment (DOLE) — Labor Code of the Philippines (Presidential Decree No. 442, as amended), Book III: Conditions of Employment (Articles 83, 86, 87, 96)](https://blr.dole.gov.ph/)
> - [Republic Act No. 11360 & DOLE Department Order No. 242-24 — 100% Service Charge Distribution Law for Hotels & Restaurants](https://www.officialgazette.gov.ph/2019/08/07/republic-act-no-11360/)
> - [National Wages and Productivity Commission (NWPC) — NCR Wage Order No. NCR-25 (Daily Minimum Wage Rates)](https://nwpc.dole.gov.ph/regionandwages/national-capital-region/)
> - [PostgreSQL Official Documentation — Appendix F.28: `pgcrypto` Cryptographic Functions](https://www.postgresql.org/docs/current/pgcrypto.html)
> - [PostgreSQL Official Documentation — Section 8.5: Date/Time Types (`TIMESTAMPTZ` & `AT TIME ZONE`)](https://www.postgresql.org/docs/current/datatype-datetime.html)
> - [National Restaurant Association (NRA) & Uniform System of Accounts for Restaurants (USAR) — Prime Cost & Labor Cost Benchmarks](https://restaurant.org/)

---

## 1. Dedicated Timeclock / Attendance Kiosk vs. POS Terminal Login

### 1.1 How Leading Hospitality POS Systems Handle Universal Staff Clock-In

In a full-service restaurant and live music venue like **Monk's Dream Jazz Bar**, the workforce comprises two distinct operational groups:

1. **POS Workflow Staff (`is_workflow_staff = true`):** Cashiers (`1111`), Floor Waiters (`2222`), Bartenders (`3333`), Baristas (`4444`), Kitchen Chefs (`5555`), FOH Runners (`6666`), and Managers (`9999`) who actively interact with POS ordering terminals, KDS prep boards, and cash drawers.
2. **Non-POS Venue Support Personnel (`is_workflow_staff = false`):** Dishwashers, Security / Bouncers, Sound Technicians, Live Jazz Musicians, Cleaners, Barbacks, and Kitchen Prep staff who must clock in and clock out for attendance and daily payroll, but **must never gain access** to Floor POS ordering, KDS ticket mutation, or cash drawer screens.

Leading hospitality platforms—**Toast POS**, **Square for Restaurants**, and **Lightspeed Restaurant K-Series**—solve this boundary by decoupling **Timeclock Punch Authentication** from **POS Workstation Session Login**:

| Dimension                      | Dedicated Timeclock Kiosk (`?mode=timeclock`)                                                                                        | Operational POS / KDS Workstation Login                                                                                             |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Target Personnel**           | **All Active Venue Personnel** (`is_workflow_staff = true` **AND** `is_workflow_staff = false`)                                      | **Strictly POS Workflow Staff** (`is_workflow_staff = true` only) or Admin Password Portal                                          |
| **Credential Mechanism**       | 4-Digit Personal Timeclock PIN (`pin_hash` verified via `pgcrypto` `crypt(p_pin, u.pin_hash)`)                                       | 4-Digit Operational PIN (`authenticate_staff_credentials`) or Admin Username + Password (`authenticate_admin_credentials`)          |
| **Session Lifecycle**          | **Stateless & Ephemeral:** Punch In / Punch Out completes in `< 2 seconds` and auto-resets to the neutral keypad after `3–5 seconds` | **Stateful Workstation Session:** Establishes a persistent Zustand auth session (`useAuthStore`) routed to Floor POS, KDS, or Admin |
| **Access to Orders & Drawers** | **Zero Access:** Cannot view tabs, ring orders, open cash drawers, or read station chat                                              | **Role-Scoped Access:** Full access to assigned station (`WaiterCashierScreen`, `UnifiedKdsScreen`, `FohRunnerScreen`)              |
| **Browser / Hardware Surface** | Dedicated browser tab (`?mode=timeclock`), wall-mounted entrance tablet, or pre-login Timeclock mode toggle on `LoginScreen`         | Counter Cashier Register, Waiter Handheld, Bar/Kitchen KDS Tablet, Manager Laptop                                                   |
| **Vendor Equivalents**         | **Toast Time Clock Screen**, **Square Shifts Passcode Kiosk (`Log In/Out -> Clock In`)**, **Lightspeed Timeclock Mode**              | **Toast Order Screen**, **Square Point of Sale Register Session**, **Lightspeed POS Mode**                                          |

_Sources: [Toast Central — Setting Up and Using the Time Clock](https://central.toasttab.com/s/article/Setting-Up-and-Using-the-Time-Clock), [Square Support — Team Management & Personal Passcodes](https://squareup.com/help/us/en/article/6396-get-started-with-team-management), [Lightspeed Restaurant K-Series — POS Users & Timeclock](https://k-series-support.lightspeedhq.com/)._

### 1.2 Why Every Staff Member Needs a `pgcrypto`-Hashed 4-Digit PIN (Without Granting POS Access)

In **Toast Web** (`Team > Employees > POS Access Code`) and **Square Dashboard** (`Staff > Team > Personal Passcode`), **every** employee—including dishwashers, bouncers, and sound engineers—is issued a unique numeric passcode strictly for the timeclock ([Toast Central](https://central.toasttab.com/s/article/Setting-Up-and-Using-the-Time-Clock), [Square Support](https://squareup.com/help/us/en/article/6396-get-started-with-team-management)):

1. **Role-Gated Authentication vs. Universal Timeclock Verification:**
   - Assigning a 4-digit PIN to a non-POS staff member (`is_workflow_staff = false`) does **not** grant them POS login privileges because the operational login RPC (`authenticate_staff_credentials`) explicitly enforces `WHERE COALESCE(u.is_workflow_staff, true) = true`.
   - If a Dishwasher or Sound Tech enters their 4-digit PIN into the **Operational POS Login** tab, `authenticate_staff_credentials` rejects the login with a clear message instructing them to use the **Timeclock Kiosk** to punch in or out.
   - Conversely, when any active staff member (`is_active = true`, whether `is_workflow_staff` is `true` or `false`) enters their 4-digit PIN into the **Timeclock Kiosk**, the dedicated timeclock RPC (`verify_timeclock_pin` / `punch_staff_timeclock`) authenticates their `pin_hash` via `crypt(p_pin, u.pin_hash)` and records an authoritative timestamped punch (`clock_in_at` / `clock_out_at`) without creating an application session.

2. **Preventing Workstation Session Hijacking via Separate Browser Tab (`?mode=timeclock`):**
   - During service hours, the Cashier terminal or Bar KDS tablet is actively logged into a station session (`useAuthStore`). If a late-arriving waiter, musician, or barback had to log out the active cashier just to clock in, it would interrupt open order entry or replace the active station operator's session.
   - By supporting a dedicated URL query mode (`/?mode=timeclock` or a one-click **"Launch Timeclock Kiosk in New Tab"** button from both `LoginScreen.tsx` and `AdminStaffView.tsx`), a venue can keep the **Timeclock Kiosk** running continuously in a separate browser tab or on an entrance tablet completely isolated from `useAuthStore` POS sessions.
   - Even if opened in the same browser via a separate tab (`?mode=timeclock`), the Timeclock Kiosk operates strictly through stateless RPC calls (`lookup_staff_by_timeclock_pin`, `punch_staff_timeclock`) and **never mutates `useAuthStore.currentUser`**, guaranteeing zero interference with an active Admin or Cashier tab in the same browser.

---

## 2. Separating Staff Roster (HR & Credentials) from Timeclock & Payroll Ledger

### 2.1 Why Duplicating the Static Staff Roster as "Daily Attendance" Is an Anti-Pattern

A common early-stage POS anti-pattern is querying the static `public.users` table (`getStaffRoster()`) and synthesizing client-side fake attendance records (`id: "att-staff-..."`, `is_present: true`) for every active employee on the roster:

1. **Distorts Daily Labor Expense & Prime Cost:**
   - Part-time jazz musicians, rotating security guards, and off-shift waiters appear "present" by default the moment the page loads—or worse, contribute `₱0` to database queries (`adminTelemetry.ts`) because synthetic client-side rows (`att-staff-*`) do not exist in PostgreSQL `public.attendance_records` until manually edited.
2. **Erases Real Punch Auditability (`clock_in_at` / `clock_out_at`):**
   - A boolean toggle (`is_present: true/false`) cannot answer _when_ an employee arrived, whether they worked a 4-hour set or a 10-hour overtime shift, whether they worked past 10:00 PM (`Asia/Manila` Night Shift Differential window), or whether they are currently **On the Clock (Active Shift)** vs. **Clocked Out (Completed Shift)**.
3. **Breaks Historical Date & Period Payroll Auditing:**
   - Synthesizing rows from today's `users` table makes looking up yesterday's or last week's payroll impossible without polluting historical dates with newly hired staff.

### 2.2 Modern Architectural Boundary: Directory vs. Timeclock & Payroll Ledger

Enterprise hospitality back-office systems (**Toast Payroll & Team Management**, **Square Shifts**, **Lightspeed Back Office**) enforce a clean two-domain separation:

| Domain Layer                                     | Primary Table / Source      | Core Responsibilities                                                                                                                                                                                    |
| :----------------------------------------------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Staff Directory & Credentials (HR Master)** | `public.users`              | Employee identity (`display_name`, `username`, `role`, `job_title`), access classification (`is_workflow_staff`), `pin_hash` (`pgcrypto` `$2a$10$`), contractual `base_daily_rate`, and active status    |
| **2. Timeclock & Payroll Ledger (Shift Events)** | `public.attendance_records` | Authoritative date-indexed shift records (`date`, `clock_in_at`, `clock_out_at`, `hours_worked`, `shift_status`, `operating_mode`, `base_daily_pay`, `addon_pay`, `total_day_pay`, `notes`, audit trail) |

_Sources: [Toast Central — Time Clock & Payroll Reports](https://central.toasttab.com/s/article/Setting-Up-and-Using-the-Time-Clock), [Square Support — Manage Timecards and Shifts](https://squareup.com/help/us/en/article/6396-get-started-with-team-management)._

### 2.3 Philippine DOLE & NCR Hospitality Labor Standards Alignment

For a Philippine hospitality venue operating in Metro Manila (`Asia/Manila`, UTC+8) across both **Daytime Cafe Mode** and **Night Event Mode** (until 6:00 AM), the Timeclock & Payroll Ledger must align with the **Labor Code of the Philippines (P.D. No. 442, as amended)** and **NWPC NCR Wage Orders**:

| Labor Provision                     | Statutory Basis                                      | Rule & Hospitality POS Ledger Impact                                                                                                                                                                                             |
| :---------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Daily Minimum Wage Baseline**     | **NWPC Wage Order No. NCR-25**                       | Non-agricultural daily minimum wage baseline in Metro Manila (`₱645.00 / day` standard baseline in `PH_MINIMUM_WAGE_DAILY`), customizable per role/contract (`users.base_daily_rate`).                                           |
| **Normal Hours of Work**            | **Labor Code Art. 83**                               | Standard full daily shift is **8.0 hours** (exclusive of 1-hour meal break). Hourly equivalent rate is derived as $\text{Hourly Rate} = \frac{\text{Base Daily Rate}}{8}$.                                                       |
| **Overtime Work (OT)**              | **Labor Code Art. 87**                               | Work performed beyond 8 hours in a business day is compensated at $\text{Hourly Rate} \times 1.25$ (+25% ordinary day) or $\times 1.30$ (+30% rest day / special day).                                                           |
| **Night Shift Differential (NSD)**  | **Labor Code Art. 86**                               | Every employee (especially **Night Event Mode** bartenders, waiters, bouncers, and sound techs) earns **not less than +10%** of their regular hourly wage for each hour worked between **10:00 PM and 6:00 AM** (`Asia/Manila`). |
| **100% Service Charge Pool**        | **R.A. No. 11360 / DOLE D.O. No. 242-24 (Art. 96)**  | 100% of collected service charges must be distributed equally among covered rank-and-file/supervisory employees (excluding managerial employees), based on actual hours/days worked (`clock_in_at` / `hours_worked`).            |
| **6:00 AM Venue Business Day Sync** | **Venue Invariant (`reconcile_operating_mode_6am`)** | Because Night Event Mode shifts run past midnight (e.g., 6:00 PM to 2:00 AM), the venue business date (`work_date`) transitions at **6:00 AM `Asia/Manila`** (`(NOW() AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE`).  |

_Sources: [DOLE Bureau of Labor Relations — Labor Code Book III](https://blr.dole.gov.ph/), [Official Gazette — Republic Act No. 11360](https://www.officialgazette.gov.ph/2019/08/07/republic-act-no-11360/), [NWPC NCR Wage Orders](https://nwpc.dole.gov.ph/regionandwages/national-capital-region/)._

### 2.4 Reference PostgreSQL Schema & `SECURITY DEFINER` Timeclock RPCs

To support real-time PIN punches from the Timeclock Kiosk alongside manager manual overrides and payroll adjustments in the Admin Back-Office:

```sql
-- 1. Enrich public.attendance_records with authoritative timeclock columns
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS clock_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shift_status TEXT NOT NULL DEFAULT 'CLOCKED_IN'
    CHECK (shift_status IN ('CLOCKED_IN', 'CLOCKED_OUT', 'MANUAL_PRESENT', 'ABSENT')),
  ADD COLUMN IF NOT EXISTS operating_mode TEXT NOT NULL DEFAULT 'CAFE'
    CHECK (operating_mode IN ('CAFE', 'EVENT')),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Stateless PIN Lookup + Punch RPC for Timeclock Kiosk (Works for ALL active staff)
CREATE OR REPLACE FUNCTION public.punch_staff_timeclock(
  p_pin TEXT,
  p_action TEXT DEFAULT 'AUTO' -- 'AUTO' | 'CLOCK_IN' | 'CLOCK_OUT'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean_pin TEXT := BTRIM(COALESCE(p_pin, ''));
  v_user RECORD;
  v_work_date DATE := ((NOW() AT TIME ZONE 'Asia/Manila') - INTERVAL '6 hours')::DATE;
  v_mode TEXT := 'CAFE';
  v_existing RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_hours NUMERIC(6, 2);
  v_base_pay NUMERIC(10, 2);
BEGIN
  IF v_clean_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Please enter a valid 4-digit Timeclock PIN.' USING ERRCODE = '22023';
  END IF;

  -- Authenticate against ANY active staff member (both POS users and non-POS venue staff)
  SELECT u.id, u.username, u.display_name, u.role, u.job_title,
         u.is_workflow_staff, u.base_daily_rate
  INTO v_user
  FROM public.users u
  WHERE COALESCE(u.is_active, true) = true
    AND u.pin_hash IS NOT NULL
    AND u.pin_hash = crypt(v_clean_pin, u.pin_hash)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid 4-digit PIN or inactive staff profile.' USING ERRCODE = '28P01';
  END IF;

  SELECT COALESCE(operating_mode::TEXT, 'CAFE') INTO v_mode
  FROM public.venue_settings LIMIT 1;

  v_base_pay := CASE
    WHEN COALESCE(v_user.base_daily_rate, 0) > 200 THEN v_user.base_daily_rate
    ELSE 645.00
  END;

  SELECT * INTO v_existing
  FROM public.attendance_records
  WHERE user_id = v_user.id AND date = v_work_date
  LIMIT 1;

  -- Determine whether to Clock In or Clock Out
  IF NOT FOUND OR v_existing.clock_in_at IS NULL OR p_action = 'CLOCK_IN' THEN
    INSERT INTO public.attendance_records (
      user_id, date, is_present, clock_in_at, clock_out_at,
      hours_worked, shift_status, operating_mode,
      base_daily_pay, addon_pay, total_day_pay, updated_at
    )
    VALUES (
      v_user.id, v_work_date, true, v_now, NULL,
      0.00, 'CLOCKED_IN', v_mode,
      v_base_pay, COALESCE(v_existing.addon_pay, 0.00),
      v_base_pay + COALESCE(v_existing.addon_pay, 0.00), v_now
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      is_present = true,
      clock_in_at = COALESCE(public.attendance_records.clock_in_at, v_now),
      clock_out_at = NULL,
      shift_status = 'CLOCKED_IN',
      updated_at = v_now
    RETURNING * INTO v_existing;

    RETURN jsonb_build_object(
      'success', true,
      'punch_type', 'CLOCK_IN',
      'work_date', v_work_date,
      'timestamp', v_now,
      'staff', jsonb_build_object(
        'id', v_user.id,
        'display_name', v_user.display_name,
        'role', v_user.role,
        'job_title', v_user.job_title,
        'is_workflow_staff', v_user.is_workflow_staff
      )
    );
  ELSE
    -- Clock Out and compute elapsed hours_worked
    v_hours := ROUND(
      GREATEST(0.01, EXTRACT(EPOCH FROM (v_now - v_existing.clock_in_at)) / 3600.0)::NUMERIC,
      2
    );

    UPDATE public.attendance_records
    SET clock_out_at = v_now,
        hours_worked = v_hours,
        shift_status = 'CLOCKED_OUT',
        is_present = true,
        updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;

    RETURN jsonb_build_object(
      'success', true,
      'punch_type', 'CLOCK_OUT',
      'work_date', v_work_date,
      'timestamp', v_now,
      'hours_worked', v_hours,
      'staff', jsonb_build_object(
        'id', v_user.id,
        'display_name', v_user.display_name,
        'role', v_user.role,
        'job_title', v_user.job_title,
        'is_workflow_staff', v_user.is_workflow_staff
      )
    );
  END IF;
END;
$$;
```

---

## 3. Hospitality Payroll & Prime Cost Integration in Admin Dashboards

### 3.1 The Restaurant Prime Cost Formula & Industry Benchmarks

Under the **Uniform System of Accounts for Restaurants (USAR)** and **National Restaurant Association (NRA)** financial standards, **Prime Cost** is the primary controllable profitability metric in hospitality because fixed occupancy costs (rent, licenses, insurance) cannot be adjusted day-to-day:

$$\text{Prime Cost (₱)} = \text{Total COGS (Food, Beverage \& Packaging)} + \text{Total Labor Expense}$$

$$\text{Prime Cost (\%)} = \left(\frac{\text{Total COGS} + \text{Total Labor Expense}}{\text{Total Net Sales}}\right) \times 100$$

$$\text{Labor Cost (\%)} = \left(\frac{\text{Total Labor Expense}}{\text{Total Net Sales}}\right) \times 100$$

| Hospitality Benchmark Metric | Full-Service Restaurant / Jazz Bar Target | Warning Threshold (`High Risk`) | Operational Meaning                                                                                                   |
| :--------------------------- | :---------------------------------------- | :------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **Total COGS %**             | `25% – 35%` of Net Sales                  | `> 38%`                         | Recipe BOM ingredient depletion + recorded waste/spillage relative to revenue                                         |
| **Total Labor Cost %**       | `25% – 35%` of Net Sales                  | `> 35%`                         | Total daily shift base pay + overtime/bonuses/add-ons (`SUM(total_day_pay)`) for clocked-in/present staff vs. revenue |
| **Prime Cost %**             | **`55% – 65%`** of Net Sales              | **`> 65%`**                     | Combined controllable cost ceiling; exceeding `65%` erodes net operating profit margin                                |
| **Estimated Net Profit**     | `10% – 20%` of Net Sales                  | `< 5%`                          | $\text{Net Sales} - \text{Total COGS} - \text{Total Labor Expense} - \text{Allocated Daily Overhead}$                 |

_Sources: [National Restaurant Association — Restaurant Operations Report](https://restaurant.org/), [Toast POS — Restaurant Prime Cost Guide & Formula](https://pos.toasttab.com/blog/on-the-line/how-to-calculate-prime-cost)._

### 3.2 Real-Time Synchronization Between the Timeclock Ledger and Executive Telemetry

In **Monk's Dream Jazz Bar POS**, when a staff member punches in at the **Timeclock Kiosk (`?mode=timeclock`)** or when an Admin records a manual shift check-in or discretionary bonus (`addon_pay`: overtime, holiday pay, event performance bonus, or tip/service-charge payout) in `AdminStaffView.tsx`:

1. **Authoritative Database Persistence (`public.attendance_records`):**
   - Every punch or manager check-in writes directly to `public.attendance_records` with `is_present = true`, `base_daily_pay`, `addon_pay`, and `total_day_pay = base_daily_pay + addon_pay`.
2. **Live Dashboard & Analytics Aggregation (`adminTelemetry.ts` & `admin.api.ts`):**
   - Both `adminTelemetryService.fetchDashboardTelemetry(timeframe)` and `adminApi.getSalesOverview(params)` query `public.attendance_records` filtered by `is_present = true` and the active date range (`date >= startDateStr AND date <= endDateStr`).
   - They compute:
     - `totalLaborCost = SUM(total_day_pay)` (falling back to `base_daily_pay + addon_pay`),
     - `clockedInStaffCount = COUNT(*)` of present shifts (with live differentiation between currently `CLOCKED_IN` active shifts and `CLOCKED_OUT` completed shifts),
     - `primeCost = totalCogs + totalLaborCost`,
     - `primeCostPercent = (primeCost / netSales) * 100`, and
     - `laborCostPercent = (totalLaborCost / netSales) * 100`.
3. **Reactive Realtime Broadcast (`pos_global_sync`):**
   - Adding `attendance_records` to the Supabase Realtime channel listener in `AdminBackOfficeScreen.tsx` ensures that the moment a waiter, bartender, bouncer, or jazz musician clocks in on the entrance Timeclock Kiosk tab, the **Admin Live Dashboard** and **Timeclock & Payroll Ledger** update instantaneously without manual page reloads.

---

## 4. Summary of Architectural Recommendations for Monk's Dream Jazz Bar POS

1. **Universal 4-Digit Timeclock PINs for All Personnel (`CreateNonWorkflowStaffModal` & `ResetPinModal`):**
   - Allow admins to assign and rotate a 4-digit Timeclock PIN (`pin_hash` via `pgcrypto` `$2a$10$`) for **both** POS User Accounts (`is_workflow_staff = true`) and Non-User Venue Staff (`is_workflow_staff = false`), while keeping `authenticate_staff_credentials` strictly locked to `is_workflow_staff = true` so support staff can use the Timeclock Kiosk without ever accessing POS terminals.
2. **Dedicated Standalone Timeclock Kiosk (`TimeclockKioskScreen.tsx` & `?mode=timeclock`):**
   - Provide a dedicated **Timeclock Kiosk** accessible via URL query `?mode=timeclock` (allowing a separate browser tab or dedicated entrance tablet) as well as a mode switch on `LoginScreen.tsx` and a **"Launch Timeclock Kiosk (New Tab)"** action in `AdminStaffView.tsx`.
   - When a staff member enters their 4-digit PIN, display their current shift status (`Not Clocked In`, `On the Clock since HH:MM`, or `Shift Completed`) with one-tap **Clock In** / **Clock Out** confirmation and automatic 4-second reset to the neutral keypad.
3. **True Timeclock & Payroll Ledger in `AdminStaffView.tsx`:**
   - Eliminate the anti-pattern of duplicating `staffRoster` as fake attendance rows.
   - Separate **Tab 1: Staff Directory & Credentials** (managing HR profiles, roles, contractual daily rates, and 4-digit PINs) from **Tab 2: Timeclock & Daily Payroll Ledger** (displaying real clocked-in/out records for the selected date with `clock_in_at`, `clock_out_at`, `hours_worked`, shift status badges, a **"+ Manual Clock-In / Record Shift"** modal for manager overrides, and **Adjust Shift Pay / Bonus** modal).
4. **Live Prime Cost & Labor Cost % on the Admin Dashboard (`AdminDashboardView.tsx` & `adminTelemetry.ts`):**
   - Surface **Total Labor Expense**, **Labor Cost %**, and **Prime Cost (`COGS + Labor`)** with healthy hospitality benchmark indicators (`55%–65%` Prime Cost target) directly on the Admin Executive Dashboard and Analytics views.
