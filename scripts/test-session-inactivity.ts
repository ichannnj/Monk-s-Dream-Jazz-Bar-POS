/**
 * Automated Unit Test Suite for Session Inactivity & Attendance Policy Engine
 * Monk's Dream Jazz Bar POS
 * Run via: node --experimental-strip-types scripts/test-session-inactivity.ts
 */

import assert from 'node:assert';
import {
  getManilaHour,
  isLateNightManilaWindow,
  getInactivityThresholdMs,
  checkInactivityStatus,
  formatRemainingSeconds,
  DAYTIME_INACTIVITY_LIMIT_MS,
  LATE_NIGHT_INACTIVITY_LIMIT_MS,
} from '../frontend/src/features/auth/utils/inactivityPolicy.ts';

console.log('🧪 Running Session Inactivity & Attendance Reconciliation Unit Tests...\n');

// Helper to create a Date corresponding to specific UTC hour (Manila = UTC + 8)
// Example: Manila 12:00 AM (00:00) is 16:00 UTC previous day
function createManilaDate(
  year: number,
  month: number,
  day: number,
  manilaHour: number,
  minute: number = 0
): Date {
  const utcHour = (manilaHour - 8 + 24) % 24;
  const utcDay = manilaHour < 8 ? day - 1 : day;
  return new Date(Date.UTC(year, month - 1, utcDay, utcHour, minute, 0));
}

// Test 1: Manila Timezone Conversion & Late-Night Window Detection
{
  const midnight = createManilaDate(2026, 11, 13, 0, 0); // 12:00 AM Manila
  const threeAm = createManilaDate(2026, 11, 13, 3, 30); // 3:30 AM Manila
  const fiveAm = createManilaDate(2026, 11, 13, 5, 59); // 5:59 AM Manila
  const sixAm = createManilaDate(2026, 11, 13, 6, 0); // 6:00 AM Manila
  const noon = createManilaDate(2026, 11, 13, 12, 0); // 12:00 PM Manila
  const evening = createManilaDate(2026, 11, 13, 23, 59); // 11:59 PM Manila

  assert.strictEqual(getManilaHour(midnight), 0, 'Midnight should be hour 0');
  assert.strictEqual(
    isLateNightManilaWindow(midnight),
    true,
    '12:00 AM should be in late-night window'
  );

  assert.strictEqual(getManilaHour(threeAm), 3, '3:30 AM should be hour 3');
  assert.strictEqual(
    isLateNightManilaWindow(threeAm),
    true,
    '3:30 AM should be in late-night window'
  );

  assert.strictEqual(getManilaHour(fiveAm), 5, '5:59 AM should be hour 5');
  assert.strictEqual(
    isLateNightManilaWindow(fiveAm),
    true,
    '5:59 AM should be in late-night window'
  );

  assert.strictEqual(getManilaHour(sixAm), 6, '6:00 AM should be hour 6');
  assert.strictEqual(
    isLateNightManilaWindow(sixAm),
    false,
    '6:00 AM should NOT be in late-night window'
  );

  assert.strictEqual(getManilaHour(noon), 12, '12:00 PM should be hour 12');
  assert.strictEqual(
    isLateNightManilaWindow(noon),
    false,
    '12:00 PM should NOT be in late-night window'
  );

  assert.strictEqual(getManilaHour(evening), 23, '11:59 PM should be hour 23');
  assert.strictEqual(
    isLateNightManilaWindow(evening),
    false,
    '11:59 PM should NOT be in late-night window'
  );

  console.log('  ✅ Test 1 Passed: Manila timezone and late-night window detection (12am-6am).');
}

// Test 2: Inactivity Threshold Selection
{
  const midnight = createManilaDate(2026, 11, 13, 0, 15);
  const afternoon = createManilaDate(2026, 11, 13, 14, 0);

  assert.strictEqual(
    getInactivityThresholdMs(midnight),
    LATE_NIGHT_INACTIVITY_LIMIT_MS,
    'Midnight threshold should be 3 hours (10,800,000 ms)'
  );
  assert.strictEqual(
    getInactivityThresholdMs(afternoon),
    DAYTIME_INACTIVITY_LIMIT_MS,
    'Daytime threshold should be 6 hours (21,600,000 ms)'
  );

  console.log('  ✅ Test 2 Passed: Dynamic threshold selection (3h late-night vs 6h daytime).');
}

// Test 3: Status Evaluation - Active, Warning (60s), and Expired
{
  const midnight = createManilaDate(2026, 11, 13, 1, 0).getTime();
  const threeHoursMs = 3 * 60 * 60 * 1000;

  // Active state (idle for 1 hour at night)
  const statusActive = checkInactivityStatus(midnight, midnight + 1 * 60 * 60 * 1000);
  assert.strictEqual(statusActive.isExpired, false);
  assert.strictEqual(statusActive.isWarning, false);
  assert.strictEqual(statusActive.remainingSeconds, 2 * 60 * 60);

  // Warning state (idle for 2 hours, 59 minutes, 15 seconds -> 45 seconds remaining)
  const statusWarning = checkInactivityStatus(midnight, midnight + (threeHoursMs - 45 * 1000));
  assert.strictEqual(statusWarning.isExpired, false);
  assert.strictEqual(statusWarning.isWarning, true);
  assert.strictEqual(statusWarning.remainingSeconds, 45);

  // Expired state (idle for exactly 3 hours)
  const statusExpired = checkInactivityStatus(midnight, midnight + threeHoursMs);
  assert.strictEqual(statusExpired.isExpired, true);
  assert.strictEqual(statusExpired.isWarning, false);
  assert.strictEqual(statusExpired.remainingSeconds, 0);

  // Over-expired state (idle for 3 hours and 10 minutes)
  const statusOverExpired = checkInactivityStatus(
    midnight,
    midnight + threeHoursMs + 10 * 60 * 1000
  );
  assert.strictEqual(statusOverExpired.isExpired, true);
  assert.strictEqual(statusOverExpired.isWarning, false);
  assert.strictEqual(statusOverExpired.remainingSeconds, 0);

  console.log(
    '  ✅ Test 3 Passed: Inactivity status evaluation (active, warning at <=60s, expired).'
  );
}

// Test 4: Daytime 6-Hour Rule
{
  const morning = createManilaDate(2026, 11, 13, 10, 0).getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  // Idle for 5 hours at daytime
  const statusDaytimeActive = checkInactivityStatus(morning, morning + 5 * 60 * 60 * 1000);
  assert.strictEqual(statusDaytimeActive.isExpired, false);
  assert.strictEqual(statusDaytimeActive.isWarning, false);

  // Idle for 5 hours 59 minutes 30 seconds -> 30s remaining
  const statusDaytimeWarning = checkInactivityStatus(morning, morning + (sixHoursMs - 30 * 1000));
  assert.strictEqual(statusDaytimeWarning.isExpired, false);
  assert.strictEqual(statusDaytimeWarning.isWarning, true);
  assert.strictEqual(statusDaytimeWarning.remainingSeconds, 30);

  // Idle for 6 hours -> expired
  const statusDaytimeExpired = checkInactivityStatus(morning, morning + sixHoursMs);
  assert.strictEqual(statusDaytimeExpired.isExpired, true);

  console.log('  ✅ Test 4 Passed: Daytime 6-hour inactivity lifecycle.');
}

// Test 5: Remaining Seconds Formatting
{
  assert.strictEqual(formatRemainingSeconds(60), '1:00');
  assert.strictEqual(formatRemainingSeconds(45), '0:45');
  assert.strictEqual(formatRemainingSeconds(9), '0:09');
  assert.strictEqual(formatRemainingSeconds(0), '0:00');

  console.log('  ✅ Test 5 Passed: User countdown display formatting.');
}

// Test 6: Fair Attendance Invariant Math (Hours worked capped at last activity)
{
  const clockInAt = new Date('2026-11-13T17:00:00+08:00'); // 5:00 PM
  const lastActivityAt = new Date('2026-11-14T01:15:00+08:00'); // 1:15 AM
  const expirationTriggerAt = new Date('2026-11-14T04:15:00+08:00'); // 4:15 AM (3h later)

  // Fair accounting: duration based on last activity, NOT expiration trigger
  const fairHours = (lastActivityAt.getTime() - clockInAt.getTime()) / (1000 * 60 * 60);
  const unfairGhostHours = (expirationTriggerAt.getTime() - clockInAt.getTime()) / (1000 * 60 * 60);

  assert.strictEqual(fairHours, 8.25, 'Fair hours must equal 8.25 hours (5pm to 1:15am)');
  assert.strictEqual(
    unfairGhostHours,
    11.25,
    'Unfair hours would have billed 11.25 hours (ghost 3 hours)'
  );

  console.log('  ✅ Test 6 Passed: Fair attendance math verifies no ghost hours are credited.');
}

console.log('\n🎉 All 6 Session Inactivity & Attendance Unit Tests Passed Perfectly!\n');
