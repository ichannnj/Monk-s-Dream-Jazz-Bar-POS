import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Search, X, Coffee, Wine, Pizza, UtensilsCrossed, Cake, Ticket } from 'lucide-react-native';
import { MenuCategory } from '../../../../types/floor';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { styles } from './OrderEntryModal.styles';

export interface OrderCategoryBarProps {
  selectedCategory: MenuCategory;
  onSelectCategory: (category: MenuCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const CATEGORIES: { id: MenuCategory; label: string; Icon: any }[] = [
  { id: 'coffee', label: 'Coffee & Espresso', Icon: Coffee },
  { id: 'cocktails_wine', label: 'Bar & Wine', Icon: Wine },
  { id: 'mains_pasta', label: 'Pasta & Mains', Icon: Pizza },
  { id: 'small_plates', label: 'Small Bites', Icon: UtensilsCrossed },
  { id: 'desserts', label: 'Desserts', Icon: Cake },
  { id: 'door_charge', label: 'Door Charge', Icon: Ticket },
];

export const OrderCategoryBar: React.FC<OrderCategoryBarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}) => {
  const categoryOptions: PosDropdownOption<MenuCategory>[] = CATEGORIES.map((cat) => ({
    value: cat.id,
    label: cat.label,
    icon: cat.Icon,
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
