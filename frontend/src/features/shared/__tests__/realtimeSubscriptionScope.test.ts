import { describe, it, expect } from 'vitest';
import { getRealtimeSubscriptionPlan } from '../utils/realtimeSubscriptionScope';

describe('getRealtimeSubscriptionPlan', () => {
  const mockStaffUser = {
    id: 'usr_staff_001',
    display_name: 'Miles Davis',
    role: 'waiter',
  };

  it('denies order CDC and team chat in public events flyer mode (?mode=events)', () => {
    const plan = getRealtimeSubscriptionPlan({
      currentUser: null,
      searchString: '?mode=events',
    });

    expect(plan.subscribeEvents).toBe(true);
    expect(plan.loadEvents).toBe(true);

    // Private business and order data must strictly NOT leak
    expect(plan.subscribeOrders).toBe(false);
    expect(plan.subscribeChat).toBe(false);
    expect(plan.subscribeVenueSettings).toBe(false);
    expect(plan.trackPresence).toBe(false);
    expect(plan.loadInitialChat).toBe(false);
  });

  it('denies all general subscriptions in dedicated hardware printer mode (?mode=printer)', () => {
    const plan = getRealtimeSubscriptionPlan({
      currentUser: null,
      searchString: '?mode=printer',
    });

    expect(plan.subscribeOrders).toBe(false);
    expect(plan.subscribeChat).toBe(false);
    expect(plan.subscribeVenueSettings).toBe(false);
    expect(plan.subscribeEvents).toBe(false);
    expect(plan.trackPresence).toBe(false);
    expect(plan.loadInitialChat).toBe(false);
    expect(plan.loadEvents).toBe(false);
  });

  it('denies all subscriptions in dedicated standalone timeclock kiosk mode (?mode=timeclock)', () => {
    const plan = getRealtimeSubscriptionPlan({
      currentUser: null,
      searchString: '?mode=timeclock',
    });

    expect(plan.subscribeOrders).toBe(false);
    expect(plan.subscribeChat).toBe(false);
    expect(plan.subscribeVenueSettings).toBe(false);
    expect(plan.subscribeEvents).toBe(false);
    expect(plan.trackPresence).toBe(false);
    expect(plan.loadInitialChat).toBe(false);
    expect(plan.loadEvents).toBe(false);
  });

  it('denies order and chat subscriptions on unauthenticated login screen while keeping venue settings', () => {
    const plan = getRealtimeSubscriptionPlan({
      currentUser: null,
      searchString: '',
    });

    expect(plan.subscribeOrders).toBe(false);
    expect(plan.subscribeChat).toBe(false);
    expect(plan.subscribeVenueSettings).toBe(true); // Retains 6:00 AM auto-revert timer & mode awareness
    expect(plan.subscribeEvents).toBe(false);
    expect(plan.trackPresence).toBe(false);
    expect(plan.loadInitialChat).toBe(false);
    expect(plan.loadEvents).toBe(false);
  });

  it('enables full realtime synchronization for authenticated staff sessions', () => {
    const plan = getRealtimeSubscriptionPlan({
      currentUser: mockStaffUser,
      searchString: '',
    });

    expect(plan.subscribeOrders).toBe(true);
    expect(plan.subscribeChat).toBe(true);
    expect(plan.subscribeVenueSettings).toBe(true);
    expect(plan.subscribeEvents).toBe(true);
    expect(plan.trackPresence).toBe(true);
    expect(plan.loadInitialChat).toBe(true);
    expect(plan.loadEvents).toBe(true);
  });

  it('keeps headless override precedence even if currentUser state exists in storage', () => {
    // Edge case: staff member was logged in, but browser tab navigated to ?mode=events
    const plan = getRealtimeSubscriptionPlan({
      currentUser: mockStaffUser,
      searchString: '?mode=events',
    });

    expect(plan.subscribeEvents).toBe(true);
    expect(plan.loadEvents).toBe(true);
    expect(plan.subscribeOrders).toBe(false);
    expect(plan.subscribeChat).toBe(false);
    expect(plan.trackPresence).toBe(false);
  });
});
