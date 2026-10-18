import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Search, X, Coffee, Wine, Pizza, UtensilsCrossed, Cake } from 'lucide-react-native';
import { MenuCategory } from '../../../mockData';
import { styles } from './OrderEntryModal.styles';

export interface OrderCategoryBarProps {
  selectedCategory: MenuCategory;
  onSelectCategory: (category: MenuCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const CATEGORIES: { id: MenuCategory; label: string; Icon: any }[] = [
  { id: 'coffee', label: 'Coffee', Icon: Coffee },
  { id: 'cocktails_wine', label: 'Bar & Wine', Icon: Wine },
  { id: 'mains_pasta', label: 'Pasta & Mains', Icon: Pizza },
  { id: 'small_plates', label: 'Small Bites', Icon: UtensilsCrossed },
  { id: 'desserts', label: 'Desserts', Icon: Cake },
];

export const OrderCategoryBar: React.FC<OrderCategoryBarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <View style={styles.catalogHeader}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryPillsScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const { Icon } = cat;

          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                onSelectCategory(cat.id);
                onSearchChange('');
              }}
              style={[styles.catPill, isActive && styles.catPillActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${cat.label} category`}
            >
              <Icon size={16} color={isActive ? '#ffffff' : '#4b5563'} strokeWidth={2.2} />
              <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Instant Search Bar */}
      <View style={styles.searchRow}>
        <Search size={16} color="#9ca3af" />
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
            <X size={16} color="#9ca3af" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
