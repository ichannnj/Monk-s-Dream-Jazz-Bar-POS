import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { MenuCategoryItem } from '../../../../types/floor';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  resolveCategoryIcon,
  DEFAULT_CATEGORIES,
  buildDynamicCategories,
} from './orderCategoryResolution';
import { styles } from './OrderEntryModal.styles';

export { resolveCategoryIcon, DEFAULT_CATEGORIES, buildDynamicCategories };

export interface OrderCategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories?: MenuCategoryItem[];
}

/** Backward-compatibility alias */
export const CATEGORIES = DEFAULT_CATEGORIES;

export const OrderCategoryBar: React.FC<OrderCategoryBarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  categories,
}) => {
  const activeCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const categoryOptions: PosDropdownOption<string>[] = activeCategories.map((cat) => ({
    value: cat.id,
    label: cat.label,
    icon: cat.Icon || resolveCategoryIcon(cat.id, cat.label),
  }));

  return (
    <View className="bg-white border-b border-stone-200 px-4 py-3 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      <PosDropdown
        options={categoryOptions}
        value={selectedCategory}
        onChange={(cat) => {
          onSelectCategory(cat);
          onSearchChange('');
        }}
        sheetTitle="Select Menu Category"
        className="w-full sm:w-56"
      />

      {/* Instant Search Bar */}
      <View style={[styles.searchRow, { flex: 1 }]}>
        <Search size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes, drinks, cocktails..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Search menu items"
        />
        {searchQuery.length > 0 ? (
          <Pressable
            onPress={() => onSearchChange('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <X size={18} color="#9ca3af" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
