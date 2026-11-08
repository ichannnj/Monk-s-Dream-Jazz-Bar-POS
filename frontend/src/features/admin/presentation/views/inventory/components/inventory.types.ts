import type {
  InventoryItemAdmin,
  SupplierAdmin,
  StockMovementAdmin,
} from '../../../../data/admin.api';

export type InventoryTab = 'stock' | 'suppliers' | 'ledger' | 'stocktake' | 'waste';
export type StockStatusFilter = 'ALL' | 'IN_PAR' | 'BELOW_PAR' | 'DEPLETED';

export interface AdminInventoryViewProps {
  inventory: InventoryItemAdmin[];
  onRefresh: () => void;
}

export const CATEGORY_FILTERS = [
  { key: 'ALL', label: 'All Categories' },
  { key: 'COFFEE_TEA', label: 'Coffee & Tea' },
  { key: 'SPIRITS_LIQUOR', label: 'Spirits & Liquor' },
  { key: 'WINE_BEER', label: 'Wine & Beer' },
  { key: 'DAIRY_PLANT', label: 'Dairy & Milks' },
  { key: 'SYRUPS_MIXERS', label: 'Syrups & Mixers' },
  { key: 'KITCHEN_MEAT', label: 'Kitchen Meats' },
  { key: 'PRODUCE', label: 'Fresh Produce' },
  { key: 'DRY_GOODS', label: 'Dry Goods' },
  { key: 'PACKAGING', label: 'Disposables & Packaging' },
];

export interface InventoryValuationMetrics {
  totalItems: number;
  totalValuation: number;
  lowStockItems: InventoryItemAdmin[];
  depletedItems: InventoryItemAdmin[];
  healthyCount: number;
}
