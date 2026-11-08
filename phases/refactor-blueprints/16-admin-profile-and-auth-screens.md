# Blueprint 16: Admin Profile & Authentication Screens Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/admin/presentation/views/AdminProfileView.tsx` (744 LOC)
  - `frontend/src/features/auth/presentation/screens/LoginScreen.tsx` (559 LOC)
  - `frontend/src/features/auth/presentation/screens/TimeclockKioskScreen.tsx` (383 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/views/profile/useAdminProfileController.ts` (`~225 LOC`)
   - Profile edit state, username sanitization, password change with strength validation, manager PIN rotation.
2. `frontend/src/features/admin/presentation/views/profile/ProfileIdentityAndAuditCards.tsx` (`~250 LOC`)
   - Display name, @username, title, email, phone fields, and security audit snapshot card.
3. `frontend/src/features/admin/presentation/views/profile/ProfilePasswordAndPinCards.tsx` (`~260 LOC`)
   - Current password verification, new password strength meter, 4-digit floor override PIN rotation card.
4. `frontend/src/features/admin/presentation/views/AdminProfileView.tsx` (`~135 LOC` View Shell)
   - Coordinates controller and profile cards.
5. `frontend/src/features/auth/presentation/components/StaffPinPadForm.tsx` (`~225 LOC`)
   - 4-digit PIN pad, quick staff avatar selection, clock-in animation.
6. `frontend/src/features/auth/presentation/components/AdminPasswordLoginForm.tsx` (`~210 LOC`)
   - Email/username and password input, show/hide password toggle, error banners.
7. `frontend/src/features/auth/presentation/screens/LoginScreen.tsx` (`~185 LOC` Screen Shell)
   - Dual-mode toggle (Staff PIN vs Admin Portal) coordinating both form sub-components.
8. `frontend/src/features/auth/presentation/components/TimeclockReceiptFeedbackCard.tsx` (`~165 LOC`)
   - Clock-in/out result receipt popup card with punch timestamp and cumulative hours worked.
9. `frontend/src/features/auth/presentation/screens/TimeclockKioskScreen.tsx` (`~235 LOC` Facade)
   - Kiosk layout delegating punch feedback to `TimeclockReceiptFeedbackCard.tsx`.

## Execution Steps

1. Split `AdminProfileView.tsx` into controller, identity card, and password/PIN card.
2. Split `LoginScreen.tsx` into staff PIN form and admin password form.
3. Extract feedback card from `TimeclockKioskScreen.tsx`.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/views/AdminProfileView.tsx \
     frontend/src/features/admin/presentation/views/profile/* \
     frontend/src/features/auth/presentation/screens/LoginScreen.tsx \
     frontend/src/features/auth/presentation/screens/TimeclockKioskScreen.tsx \
     frontend/src/features/auth/presentation/components/*
pnpm sync:knowledge
```
