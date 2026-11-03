# Hospitality POS Admin Authentication, `pgcrypto` Secret Hashing & Profile Security Best Practices

> **Research Scope:** Architectural and security best practices for separating Back-Office Admin Console authentication from Floor POS Manager Override PINs, hashing all credentials (`password_hash` and `pin_hash`) using PostgreSQL `pgcrypto` inside `SECURITY DEFINER` RPCs, and designing an enterprise-grade Admin Profile & Security Settings View for **Monk's Dream Jazz Bar POS**.  
> **Primary Sources Consulted:**
>
> - [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
> - [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
> - [OWASP Application Security Verification Standard (ASVS v4.0.3) — V2 Authentication](https://owasp.org/www-project-application-security-verification-standard/)
> - [NIST Special Publication 800-63B — Digital Identity Guidelines: Authentication and Lifecycle Management](https://pages.nist.gov/800-63-3/sp800-63b.html)
> - [PostgreSQL Official Documentation — Appendix F.28: `pgcrypto` Cryptographic Functions](https://www.postgresql.org/docs/current/pgcrypto.html)
> - [PostgreSQL Official Documentation — `CREATE FUNCTION`: Writing `SECURITY DEFINER` Functions Safely](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
> - [Toast POS Central — POS Access Codes vs. Toast Web Login](https://central.toasttab.com/)
> - [Square Support Center — Team Passcodes, Personal Passcodes, and Dashboard Permissions](https://squareup.com/help/us/en/article/6396-get-started-with-team-management)
> - [Lightspeed Restaurant Support — Back Office User Accounts vs. POS PIN Codes](https://k-series-support.lightspeedhq.com/)

---

## 1. Separate Admin Password Login vs. Floor Manager Override PIN

### 1.1 Industry Pattern Across Hospitality POS Platforms

Leading hospitality POS platforms—including **Toast POS**, **Square for Restaurants**, and **Lightspeed Restaurant**—enforce a strict architectural boundary between two distinct authentication credentials held by managers and administrators:

| Dimension                  | Back-Office Admin Console Login                                                                                                 | Floor POS Manager Override PIN                                                                                                       |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------- |
| **Credential Format**      | Username / Email + Strong Alphanumeric Password (`>= 8–15` chars)                                                               | 4-to-6 Digit Numeric Passcode (`0000`–`9999`)                                                                                        |
| **Primary Surface**        | Admin Back-Office Portal (Desktop, Laptop, Manager Tablet)                                                                      | Shared Floor POS Terminal, Bar KDS, Expediter Tablet                                                                                 |
| **Operational Context**    | Low-frequency, high-privilege administrative sessions                                                                           | High-frequency, time-critical floor authorizations under service pressure                                                            |
| **Protected Operations**   | Menu & BOM recipe engineering, inventory cost ledger, payroll & staff creation, X/Y/Z fiscal closeouts, tax/venue configuration | Post-prep item voids, comps/discounts, switching Daytime Cafe / Night Event mode (`ManagerModeSwitchModal`), emergency table release |
| **Threat Model**           | Remote/network credential stuffing, unattended browser session hijacking, unauthorized back-office privilege escalation         | Shoulder-surfing at shared counter terminals, rapid keypad entry with wet/busy hands                                                 |
| **Vendor Implementations** | **Toast Web** (`email + password`), **Square Dashboard** (`email + password`), **Lightspeed Back Office** (`email + password`)  | **Toast POS Access Code**, **Square Team/Manager Passcode**, **Lightspeed POS Manager PIN**                                          |

_Sources: [Toast Central — Managing User Permissions & Access Codes](https://central.toasttab.com/), [Square Support — Team Management & Passcodes](https://squareup.com/help/us/en/article/6396-get-started-with-team-management), [Lightspeed Restaurant K-Series — POS Users & PINs](https://k-series-support.lightspeedhq.com/)._

### 1.2 Why Hospitality Systems Separate These Credentials

1. **Mitigating Shoulder-Surfing on Shared Terminals (Physical Threat Isolation):**
   - Floor POS terminals (`WaiterCashierScreen`, `UnifiedKdsScreen`) sit in high-traffic environments where staff and guests stand within direct line of sight.
   - When a manager steps up to a waiter's terminal to authorize a post-prep void, switch `CAFE` ↔ `EVENT` operating mode, or force-release a stuck table, typing a 4-digit PIN on a large touch keypad takes `< 1.5 seconds`.
   - If the manager's 4-digit PIN also granted full entry into the Admin Back-Office Console (or if the manager had to type their full Admin password on a public floor screen), a single shoulder-surfed observation would expose payroll rates, Z-reading fiscal archives, inventory valuation, and staff account management ([Toast Central](https://central.toasttab.com/), [Square Support](https://squareup.com/help/us/en/article/6396-get-started-with-team-management)).

2. **Entropy vs. Ergonomics Trade-Off (NIST SP 800-63B & OWASP):**
   - A 4-digit numeric PIN has a keyspace of only $10^4 = 10,000$ combinations ($\approx 13.29\text{ bits}$ of entropy). Under [NIST SP 800-63B Section 5.1.1](https://pages.nist.gov/800-63-3/sp800-63b.html) and the [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), a 4-digit PIN is insufficient as a standalone authenticator for administrative back-office control panels, which require high-entropy memorized secrets (passwords/passphrases).
   - Conversely, requiring a 12+ character alphanumeric password on an on-screen virtual keyboard during a Friday night jazz rush just to void a misfired cocktail or toggle Event Mode degrades floor throughput and incentivizes staff to share logged-in admin terminals.

3. **Principle of Least Privilege & Blast-Radius Containment:**
   - **Floor Override PIN (`pin_hash`)**: Scoped exclusively to _ephemeral, single-action transactional overrides_ (`verify_manager_pin` RPC) or floor terminal clock-in, always tied to an immutable audit log entry (e.g., who authorized a void or mode switch).
   - **Admin Console Password (`password_hash`)**: Required to establish an authenticated Admin Back-Office session (`authenticate_admin_credentials` RPC) or to mutate security-critical account settings (changing password, rotating the Manager Override PIN, editing staff payroll/roles).

---

## 2. Cryptographic Hashing of All Secrets in PostgreSQL (`pgcrypto`)

### 2.1 Zero Plaintext Secrets in Storage or Over the Wire

Per the [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and [OWASP ASVS v4.0.3 (V2.4 Credential Storage Requirements)](https://owasp.org/www-project-application-security-verification-standard/):

- **Never Store Plaintext Secrets:** Neither passwords nor PINs may ever be stored in plaintext columns (such as `pin text` or `password text`) in `public.users`. Even though a 4-digit PIN has a small search space, storing salted slow hashes (`pin_hash`) prevents casual inspection via database dumps, read-replica leaks, or accidental `SELECT *` projections over Supabase PostgREST.
- **Never Expose Hashes or Plaintext to the Client Table API:** In a Supabase / PostgREST architecture, client applications must **never** pull `password_hash` or `pin_hash` down to the browser/tablet for client-side comparison, nor should client code ever query `SELECT pin FROM users`. All credential verification and mutation must occur strictly inside server-side PostgreSQL `SECURITY DEFINER` RPCs that accept the candidate secret over TLS, evaluate `crypt()` inside the database engine, and return only a sanitized session profile or boolean result.

### 2.2 PostgreSQL `pgcrypto` Mechanics: `crypt()` and `gen_salt('bf', work_factor)`

According to the [PostgreSQL Official `pgcrypto` Documentation (Section F.28.2 — Password-Hashing Functions)](https://www.postgresql.org/docs/current/pgcrypto.html):

1. **Extension Activation:**

   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
   ```

   _(Note: In Supabase environments, `pgcrypto` is commonly installed in either `extensions` or `public`; referencing `extensions.crypt` / `extensions.gen_salt` or including `extensions` in the function `search_path` ensures portability.)_

2. **Generating Salted Bcrypt (`bf`) Hashes (`gen_salt` + `crypt`):**
   - `gen_salt('bf', iter_count)` generates a random 128-bit salt formatted for the Blowfish-based `bcrypt` algorithm (`$2a$` modular crypt format), embedding the logarithmic cost parameter (`iter_count`, where iteration count $= 2^{\text{iter\_count}}$).
   - **Recommended Work Factor (`10`):** The [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) specifies a minimum work factor of **`10`** ($2^{10} = 1,024$ rounds) for `bcrypt`. In PostgreSQL `pgcrypto`, `gen_salt('bf', 10)` takes ~65–90ms on modern server CPUs—fast enough for instant POS responsiveness while making offline brute-force attacks orders of magnitude slower than unsalted SHA/MD5.
   - **Output Characteristics:** `crypt(secret, gen_salt('bf', 10))` produces a self-contained **60-character** string (e.g., `$2a$10$......................................................`) containing the algorithm identifier, cost factor, 22-character base64 salt, and 31-character hash digest ([PostgreSQL `pgcrypto` Docs](https://www.postgresql.org/docs/current/pgcrypto.html)).
   - **72-Byte Input Limit:** PostgreSQL `pgcrypto` and OWASP both document that `bf` (`bcrypt`) truncates inputs beyond **72 bytes** ([OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [PostgreSQL `pgcrypto` Docs](https://www.postgresql.org/docs/current/pgcrypto.html)). Admin password inputs should therefore enforce a maximum length of `64–72` characters in UI and RPC validation.

3. **Constant-Time Verification Pattern in SQL:**
   When verifying a candidate password or PIN against a stored hash, pass the **stored hash column itself** as the second argument (`salt`) to `crypt()`:
   ```sql
   -- Verification expression:
   u.password_hash IS NOT NULL
   AND u.password_hash = crypt(p_candidate_password, u.password_hash)
   ```
   `crypt()` extracts the algorithm, cost factor, and 128-bit salt from `u.password_hash`, hashes `p_candidate_password` using identical parameters, and compares the resulting 60-character string ([PostgreSQL `pgcrypto` Docs](https://www.postgresql.org/docs/current/pgcrypto.html)).

### 2.3 Hardening `SECURITY DEFINER` Authentication RPCs

According to [PostgreSQL Official Documentation — Writing `SECURITY DEFINER` Functions Safely](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY):

1. **Pin `search_path` Explicitly:**
   Every `SECURITY DEFINER` function must specify `SET search_path = public, extensions` (or `SET search_path = ''` with fully schema-qualified calls) to prevent malicious callers from hijacking unqualified table or function references via temporary schemas (`pg_temp`).
2. **Column-Level / View Separation:**
   The `public.users` table should store `password_hash TEXT` and `pin_hash TEXT` (alongside metadata columns `password_updated_at TIMESTAMPTZ`, `pin_updated_at TIMESTAMPTZ`, and `last_login_at TIMESTAMPTZ`). Every RPC returning user rows must project only safe profile columns (`id`, `username`, `name`, `role`, `job_title`, `email`, `phone`, `avatar_url`, `is_active`, `is_workflow_staff`, `password_updated_at`, `pin_updated_at`, `last_login_at`) and **never** return `password_hash` or `pin_hash`.
3. **Current-Credential Re-Authentication Before Secret Mutation:**
   Per the [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [ASVS V2.1.6](https://owasp.org/www-project-application-security-verification-standard/), any RPC that changes an Admin's password (`update_admin_password`) or rotates an Admin's Floor Override PIN (`update_admin_override_pin`) **must** verify `p_current_password` against `password_hash` inside the same atomic transaction before writing the new `crypt(..., gen_salt('bf', 10))` digest.

#### Reference SQL Pattern for `pgcrypto` in `SECURITY DEFINER` RPCs

```sql
-- 1. Admin Back-Office Login (Username + Password -> Safe Profile)
CREATE OR REPLACE FUNCTION public.authenticate_admin_credentials(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT
    u.id, u.username, u.name, u.role, u.job_title,
    u.email, u.phone, u.avatar_url, u.is_active,
    u.password_hash, u.password_updated_at, u.pin_updated_at, u.last_login_at
  INTO v_user
  FROM public.users u
  WHERE LOWER(BTRIM(u.username)) = LOWER(BTRIM(p_username))
    AND u.role = 'admin'
    AND COALESCE(u.is_active, true) = true
    AND COALESCE(u.is_workflow_staff, true) = true
  LIMIT 1;

  IF NOT FOUND OR v_user.password_hash IS NULL
     OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION 'Invalid admin username or password'
      USING ERRCODE = '28P01';
  END IF;

  UPDATE public.users
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'username', v_user.username,
    'name', v_user.name,
    'role', v_user.role,
    'job_title', v_user.job_title,
    'email', v_user.email,
    'phone', v_user.phone,
    'avatar_url', v_user.avatar_url,
    'password_updated_at', v_user.password_updated_at,
    'pin_updated_at', v_user.pin_updated_at,
    'last_login_at', NOW()
  );
END;
$$;

-- 2. Floor Manager Override PIN Verification (4-Digit PIN -> Boolean / Authorizer Info)
CREATE OR REPLACE FUNCTION public.verify_manager_override_pin(
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_manager RECORD;
BEGIN
  SELECT u.id, u.username, u.name, u.role, u.job_title
  INTO v_manager
  FROM public.users u
  WHERE u.role = 'admin'
    AND COALESCE(u.is_active, true) = true
    AND COALESCE(u.is_workflow_staff, true) = true
    AND u.pin_hash IS NOT NULL
    AND u.pin_hash = crypt(BTRIM(p_pin), u.pin_hash)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'manager_id', v_manager.id,
    'manager_name', v_manager.name
  );
END;
$$;
```

---

## 3. Admin Profile & Security Settings View Best Practices

Drawing from **OWASP Authentication & Session Management Cheat Sheets**, **NIST SP 800-63B**, and the account security portals of **Toast Web**, **Square Dashboard**, and **Lightspeed Back Office**, a dedicated **Admin Profile & Security View** in a hospitality POS back-office should be organized into four cohesive functional cards/sections:

### 3.1 Personal Identity & Profile Card

Allows the administrator/manager to maintain accurate identity metadata displayed across shift handover slips (Y/Z-Readings), floor override audit trails, and universal team chat (`#foh`, `#bar`, `#cafe`, `#kitchen`, and 1-on-1 DMs):

- **Avatar / Monogram Initials Badge:** Visual badge showing custom avatar URL or auto-derived 2-letter initials alongside an active `"ADMIN / MANAGER"` role pill.
- **Display Name (`name`):** Full name printed on X/Y/Z fiscal readings, void authorization logs, and chat headers.
- **Username / Admin Login ID (`username`):** Unique identifier used with the Admin Password at the Back-Office login screen (normalized lowercase/trimmed, uniqueness validated server-side).
- **Custom Job Title (`job_title`):** Hospitality title (e.g., _General Manager_, _Managing Partner_, _Beverage Director_, _Floor Manager_).
- **Contact Information (`email`, `phone`):** Recovery/notification email address and contact mobile number for venue escalation.

### 3.2 Back-Office Password Management Card

Governed by [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html):

- **Current Password Verification (`currentPassword`):** Mandatory re-authentication field to prevent session-hijack account takeovers ([OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)).
- **New Password Input with Show/Hide Toggle & Paste Support:** Must allow pasting from password managers and support characters up to 64–72 bytes (matching `pgcrypto` Blowfish's 72-byte ceiling).
- **Live Password Strength Meter & Requirement Checklist:**
  - Real-time visual strength indicator (`Weak` / `Fair` / `Good` / `Strong`) evaluating length (`>= 8` chars minimum, `12+` recommended), character variety, and rejection of common weak patterns (`password`, `12345678`, `admin`, or matching the username/PIN).
- **Confirm New Password Field:** Real-time match indicator before submission.
- **Last Password Change Timestamp (`password_updated_at`):** Displays when the password was last rotated (e.g., _"Last updated: Nov 3, 2026, 7:15 PM"_).

### 3.3 Floor Manager Override PIN Management Card

Explicitly educates the manager on the separation between their **Back-Office Password** and their **4-Digit Floor Override PIN** ([Toast Central](https://central.toasttab.com/), [Square Support](https://squareup.com/help/us/en/article/6396-get-started-with-team-management)):

- **Contextual Usage Banner:** Clear explanation that this 4-digit PIN is used on Floor POS and KDS tablets to authorize **Cafe ↔ Event Mode switches** (`ManagerModeSwitchModal`), **post-prep item voids**, **comps**, and **emergency table releases**, while never granting unauthenticated access to Back-Office password settings.
- **Current Admin Password Verification:** Changing the 4-digit Floor Override PIN requires entering the **current Admin Password** (strong credential guards weak credential), preventing a bystander who knows the old 4-digit PIN from rotating it.
- **New 4-Digit Override PIN & Confirmation (`^\d{4}$`):**
  - Strictly validated for 4 numeric digits.
  - Collision check inside PostgreSQL (`SECURITY DEFINER` RPC) ensuring the new PIN does not collide with another active workflow staff member's PIN if terminal PIN lookup requires unique per-user identification.
- **Last PIN Rotation Timestamp (`pin_updated_at`):** Displays when the override PIN was last changed.

### 3.4 Active Session & Security Audit Snapshot Card

Provides immediate operational situational awareness modeled after enterprise hospitality back-office portals:

- **Session & Terminal Telemetry:**
  - **Last Login Timestamp (`last_login_at`)** and current session status (`Active — Admin Back-Office`).
  - **Role & Permission Scope Badge:** Lists granted capabilities (_Full Back-Office Access, X/Y/Z Fiscal Closeout, BOM & Inventory Ledger, Payroll & Staff Credentials, Floor Override Authorization_).
  - **Current Venue Operating Mode Indicator:** Live status (`Daytime Cafe Mode` vs. `Night Event Mode`) and timestamp of last mode switch (`mode_switched_at`).
- **Recent Security & Authorization Events Feed:**
  - Displays recent high-sensitivity security actions (e.g., last password update, last Manager Override PIN rotation, recent operating mode switch, or quick action to sign out / lock the Admin Back-Office session).

---

## 4. Summary of Recommendations for Monk's Dream Jazz Bar POS

1. **Dual-Credential Schema on `public.users`:**
   - Migrate `public.users` to store `pin_hash TEXT` and `password_hash TEXT` (generated via `crypt(secret, gen_salt('bf', 10))`), plus audit timestamps `password_updated_at TIMESTAMPTZ`, `pin_updated_at TIMESTAMPTZ`, and `last_login_at TIMESTAMPTZ`.
2. **Split Authentication Flows by Operational Surface:**
   - **Operational Stations (Floor POS, Bar/Cafe/Kitchen KDS, FOH Runner):** Authenticate quick staff shifts via 4-digit PIN (`authenticate_staff_credentials` comparing `crypt(p_pin, u.pin_hash)`), and authorize manager floor overrides via `verify_manager_pin` comparing `crypt(p_pin, u.pin_hash)` against active `admin` accounts.
   - **Admin Back-Office Console:** Require **Username + Admin Password** (`authenticate_admin_credentials` comparing `crypt(p_password, u.password_hash)`), ensuring a shoulder-surfed 4-digit floor PIN cannot unlock the Admin Back-Office.
3. **Dedicated Admin Profile & Security View (`AdminProfileView.tsx`):**
   - Provide a responsive, NativeWind v4 (`>= 16px` typography floor, `>= 48px` touch targets) Admin Profile & Security screen accessible directly from the Admin Back-Office header, navigation drawer, and dropdown selector.
