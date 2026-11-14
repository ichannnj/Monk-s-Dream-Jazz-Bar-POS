/**
 * Realtime Subscription Scope Policy
 *
 * Governs which Supabase Realtime CDC channels and telemetry loops are active
 * depending on authenticated staff state and station operating mode.
 *
 * Guarantees zero order and chat data leakage in public modes (?mode=events)
 * and headless terminals (?mode=printer, ?mode=timeclock).
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

function parseModeParam(search: string): string | null {
  if (!search) return null;
  try {
    const cleanSearch = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(cleanSearch);
    return params.get('mode');
  } catch {
    return null;
  }
}

export function getRealtimeSubscriptionPlan(
  context: ScopeEvaluationContext
): RealtimeSubscriptionPlan {
  const search = context.searchString || '';
  const mode = parseModeParam(search);

  const isPublicEventsMode = mode === 'events';
  const isPrinterMode = mode === 'printer';
  const isTimeclockMode = mode === 'timeclock';
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

  // 3. Unauthenticated sessions on standard workstation login screen (!currentUser)
  // Subscribes ONLY to public venue operating mode (?CAFE vs EVENT) to keep 6:00 AM
  // daily auto-revert timers active on idle terminals. Strictly blocks orders CDC & chat.
  if (!context.currentUser) {
    return {
      subscribeOrders: false,
      subscribeChat: false,
      subscribeVenueSettings: true,
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
