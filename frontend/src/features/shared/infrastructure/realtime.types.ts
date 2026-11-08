export interface StationOrderPayload {
  orderItemId: string;
  orderId: string;
  productId: string;
  quantity: number;
  stationTarget: 'bar' | 'kitchen';
  status: string;
  notes?: string;
}

export interface TableOccupancyPayload {
  tableId: string;
  tableNumber: string;
  isOccupied: boolean;
}

export interface Auto86Payload {
  productId: string;
  name: string;
  auto86: boolean;
  outOfStockReason?: string;
}

export interface BuzzoutPayload {
  orderId: string;
  tableNumber?: string;
  customerName?: string;
  orderType: string;
  readyItemsCount: number;
  totalItemsCount: number;
}

export interface TableTransferPayload {
  originTableId: string;
  originTableCode: string;
  targetTableId: string;
  targetTableCode: string;
  mode: 'entire' | 'tab';
  tabIndex?: number;
  guestName?: string;
  prepItemsCount: number;
  reason?: string;
  timestamp: string;
}

export interface GlobalRealtimeCallbacks {
  onTableChange?: (payload: any) => void;
  onTabChange?: (payload: any) => void;
  onOrderItemChange?: (payload: any) => void;
  onOrderChange?: (payload: any) => void;
  onProductChange?: (payload: any) => void;
  onCategoryChange?: (payload: any) => void;
  onUserChange?: (payload: any) => void;
  onTransferLog?: (payload: any) => void;
  onTableTransfer?: (payload: TableTransferPayload) => void;
  onBuzzout?: (payload: any) => void;
  onCashDrawerChange?: (payload: any) => void;
  onPaymentChange?: (payload: any) => void;
  onInventoryChange?: (payload: any) => void;
  onStockMovementChange?: (payload: any) => void;
  onWasteLogChange?: (payload: any) => void;
  onAttendanceChange?: (payload: any) => void;
  onPosSyncNeeded?: (payload: { reason: string; timestamp: string }) => void;
}

export interface ChatRealtimeCallbacks {
  onInsert: (msg: any) => void;
  onUpdate: (msg: any) => void;
  onConversationUpdate?: (conv: any) => void;
  onParticipantInsert?: (participant: any) => void;
  onUserUpdate?: (user: any) => void;
  onPresenceSync?: (onlineUserIds: string[]) => void;
  onStatusChange?: (status: string) => void;
}
