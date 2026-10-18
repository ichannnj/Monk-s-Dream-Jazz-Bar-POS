import { OrderLineItem } from '../../../types/floor';

export type KdsStage = 'new' | 'preparing' | 'ready';

export interface BarItemLine extends OrderLineItem {
  is86?: boolean;
  isVoided?: boolean;
  voidReason?: string;
}

export interface BarTicket {
  id: string;
  orderNumber: string; // e.g. "#1047"
  tableOrSource: string; // e.g. "Table A3"
  stage: KdsStage;
  elapsedTime: string; // e.g. "00:20" or "06:20"
  minutesElapsed: number;
  badges: string[];
  roundNumber?: number;
  multiStationTag?: string; // e.g. "Multi-Station · Cafe · Preparing"
  items: BarItemLine[];
  specialNote?: string; // e.g. "! Serve with lemon"
  voidNote?: string; // e.g. "! Sparkling Water voided · Do not prepare"
  isReadyBlocked?: boolean;
  hasFohStatusAlert?: boolean;
  fohStatusMessage?: string;
  serverName?: string;
}

export interface StockInventoryItem {
  id: string;
  name: string;
  category: 'beer' | 'wine' | 'spirits' | 'coffee' | 'water' | 'garnishes';
  unit: string;
  inStockCount: number;
  lowStockThreshold: number;
  is86: boolean;
}

export interface BarProductStock {
  id: string;
  name: string;
  category: string;
  is86: boolean;
  stockCount?: number;
}
