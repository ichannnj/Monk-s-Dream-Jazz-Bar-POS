import { ProductAdmin, CategoryAdmin } from '../../../../data/admin.api';

export interface MenuItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductAdmin | null;
  categories: CategoryAdmin[];
}

export interface ProductModifierStateItem {
  id?: string;
  name: string;
  price_delta: string;
  applicable_category: string;
  inventory_item_id?: string | null;
  amount_delta?: number;
  unit?: string | null;
}

export interface VariantMatrixRow {
  id?: string;
  temperature: 'HOT' | 'COLD' | 'NONE';
  size_label: string;
  price: string;
  is_available: boolean;
}

export interface ProductFlavorOptionStateItem {
  id: string; // option_id
  groupId: string;
  code: string;
  name: string;
  price_delta: string;
  is_assigned: boolean;
  is_available: boolean;
  is_default: boolean;
}

export const ALLERGEN_OPTIONS = [
  'DAIRY',
  'GLUTEN',
  'NUTS',
  'SOY',
  'EGGS',
  'FISH',
  'SHELLFISH',
  'SESAME',
  'ALCOHOL',
  'CAFFEINE',
];

export const DIETARY_OPTIONS = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'HALAL', 'KETO'];

export const PRESET_SIZES = ['8oz', '12oz', '16oz', 'Regular', 'Large', 'Single', 'Double'];
