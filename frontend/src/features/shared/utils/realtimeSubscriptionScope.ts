/**
 * Realtime Subscription Scope Policy
 *
 * Governs which Supabase Realtime CDC channels and telemetry loops are active
 * depending on authenticated staff state and station operating mode.
 *
 * Guarantees zero data leakage in public modes (?mode=events) and headless
 * terminals (?mode=printer, ?mode=timeclock).
 */

export interface RealtimeSubscriptionPlan {
  subscribeOrders: boolean;
  subscribeChat: boolean;
  subscribeVenueSettings: boolean;
  subscribeEvents: boolean;
  trackPresence: boolean;
  loadInitialChat: boolean;
  loadEvents: boolean;
}

export interface ScopeEvaluationContext {
  currentUser: { id: string; role?: string } | null | undefined;
  searchString?: string;
}

export function getRealtimeSubscriptionPlan(
  context: ScopeEvaluationContext
): RealtimeSubscriptionPlan {
  const search = context.searchString || '';

  const isPublicEventsMode = search.includes('mode=events');
  const isPrinterMode = search.includes('mode=printer');
  const isTimeclockMode = search.includes('mode=timeclock');
  const isHeadless = isPublicEventsMode || isPrinterMode || isTimeclockMode;

  // 1. Dedicated Public Events Flyer Mode (?mode=events)
  // Subscribes ONLY to public events schedule; zero order/chat leakage.
  if (isPublicEventsMode) {
    return {
      subscribeOrders: false,
      subscribeChat: false,
      subscribeVenueSettings: false,
      subscribeEvents: true,
      trackPresence: false,
      loadInitialChat: false,
      loadEvents: true,
    };
  }

  // 2. Headless hardware modes (?mode=printer, ?mode=timeclock)
  // Dedicated terminals manage their own specialized RPC/heartbeats.
  if (isHeadless) {
    return {
      subscribeOrders: false,
      subscribeChat: false,
      subscribeVenueSettings: false,
      subscribeEvents: false,
      trackPresence: false,
      loadInitialChat: false,
      loadEvents: false,
    };
  }

  // 3. Unauthenticated sessions (LoginScreen)
  // Do not open order CDC or team chat channels until employee authenticates.
  if (!context.currentUser) {
    return {
      subscribeOrders: false,
      subscribeChat: false,
      subscribeVenueSettings: false,
      subscribeEvents: false,
      trackPresence: false,
      loadInitialChat: false,
      loadEvents: false,
    };
  }

  // 4. Authenticated Operational Staff Sessions (Floor POS, KDS, FOH, Admin)
  // Full real-time synchronization enabled.
  return {
    subscribeOrders: true,
    subscribeChat: true,
    subscribeVenueSettings: true,
    subscribeEvents: true,
    trackPresence: true,
    loadInitialChat: true,
    loadEvents: true,
  };
}
