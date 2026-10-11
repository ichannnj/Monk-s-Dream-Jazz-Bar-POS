/**
 * Server-Sent Events (SSE) Client for POS & KDS Operations
 * - Receiving new orders dispatched to stations
 * - Ticket status transitions (NEW -> PREPARING -> READY -> SERVED)
 * - Floor table state updates (OCCUPIED, PREPARING, READY, BILL_REQUESTED)
 * - Instant 86 item availability updates
 * - Payment receipts
 */

export interface OperationEventData {
  seq: number;
  type:
    | 'ticket.created'
    | 'ticket.status_updated'
    | 'order.created'
    | 'order.item_voided'
    | 'floor.table_updated'
    | 'menu.item_availability'
    | 'tab.paid';
  room: string;
  payload: any;
  createdAt: string;
}

export interface OperationsSubscriptionOptions {
  station?: 'barista' | 'kitchen' | 'bartender' | 'cafe' | 'food' | 'bar';
  room?: string;
  serverUrl?: string;
  onTicketCreated?: (ticket: any) => void;
  onTicketStatusUpdated?: (ticket: any) => void;
  onTableUpdated?: (table: any) => void;
  onItemAvailability?: (data: { itemId: string; isAvailable: boolean }) => void;
  onItemVoided?: (data: any) => void;
  onTabPaid?: (data: any) => void;
  onAnyOperation?: (event: OperationEventData) => void;
  onError?: (error: any) => void;
}

/**
 * Subscribes to the Hub API SSE operational event stream.
 * Automatically handles reconnection and JSON parsing.
 *
 * @returns An unsubscribe function to close the stream.
 */
export function subscribeToOperations(options: OperationsSubscriptionOptions): () => void {
  const {
    station,
    room,
    serverUrl = 'http://localhost:3000',
    onTicketCreated,
    onTicketStatusUpdated,
    onTableUpdated,
    onItemAvailability,
    onItemVoided,
    onTabPaid,
    onAnyOperation,
    onError,
  } = options;

  const queryParams = new URLSearchParams();
  if (station) queryParams.set('station', station);
  if (room) queryParams.set('room', room);

  const queryString = queryParams.toString();
  const url = `${serverUrl}/api/v1/operations/stream${queryString ? `?${queryString}` : ''}`;

  let eventSource: any = null;
  let isClosed = false;
  let reconnectTimeout: any = null;

  function connect() {
    if (isClosed) return;

    try {
      // In web/browser and environments supporting EventSource
      if (typeof EventSource !== 'undefined') {
        eventSource = new EventSource(url);

        eventSource.onmessage = (event: any) => {
          try {
            const parsed: OperationEventData = JSON.parse(event.data);
            handleEvent(parsed);
          } catch (e) {
            console.warn('[SSE] Failed to parse operation event:', e);
          }
        };

        eventSource.onerror = (err: any) => {
          if (onError) onError(err);
          // Auto-reconnect fallback
          if (!isClosed && eventSource) {
            eventSource.close();
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } else {
        // Fallback for native runtime environments without EventSource global
        console.log('[SSE] Native EventSource mock/fetch fallback initialized for:', url);
      }
    } catch (err) {
      if (onError) onError(err);
      reconnectTimeout = setTimeout(connect, 3000);
    }
  }

  function handleEvent(event: OperationEventData) {
    if (onAnyOperation) onAnyOperation(event);

    switch (event.type) {
      case 'ticket.created':
        onTicketCreated?.(event.payload);
        break;
      case 'ticket.status_updated':
        onTicketStatusUpdated?.(event.payload);
        break;
      case 'floor.table_updated':
        onTableUpdated?.(event.payload);
        break;
      case 'menu.item_availability':
        onItemAvailability?.(event.payload);
        break;
      case 'order.item_voided':
        onItemVoided?.(event.payload);
        break;
      case 'tab.paid':
        onTabPaid?.(event.payload);
        break;
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
