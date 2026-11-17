import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import {
  UtensilsCrossed,
  Leaf,
  AlertTriangle,
  AlertCircle,
  Ban,
  Search,
  FolderPlus,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { MenuItem } from '../../../../types/floor';
import { resolveCategoryIcon } from './OrderCategoryBar';
import { styles } from './OrderEntryModal.styles';

export interface OrderMenuItemGridProps {
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  searchQuery?: string;
  selectedCategoryLabel?: string;
  onClearSearch?: () => void;
}

const MenuItemCard: React.FC<{
  item: MenuItem;
  onItemClick: (item: MenuItem) => void;
}> = ({ item, onItemClick }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const isExplicitlyDisabled = !item.isAvailable;
  const isDepleted = item.stockStatus === 'depleted';
  const isLowStock = item.stockStatus === 'low_stock';
  const CategoryIcon = resolveCategoryIcon(item.category, item.categoryName);

  // Step 4.3: Resold outside food +20% locked price calculation
  // Resold outside food +20% locked price calculation or variant pricing
  const hasVariants = Boolean(item.variants && item.variants.length > 0);
  const minVariantPrice = hasVariants
    ? Math.min(...(item.variants?.map((v) => v.price) || [item.price]))
    : item.price;
  const maxVariantPrice = hasVariants
    ? Math.max(...(item.variants?.map((v) => v.price) || [item.price]))
    : item.price;
  const isMultiPrice = hasVariants && minVariantPrice !== maxVariantPrice;

  const displayPrice =
    item.isResoldOutsideFood && item.originalCost ? item.originalCost * 1.2 : minVariantPrice;

  const priceLabel = isMultiPrice
    ? `From ${formatCurrency(minVariantPrice)}`
    : formatCurrency(displayPrice);

  const handlePress = () => {
    if (isExplicitlyDisabled) return;
    if (isDepleted) {
      toast.warning(
        `${item.name}: Ingredient is depleted in inventory (${item.stockAlertMessage || '0 stock'}). Order allowed.`,
        { title: 'Depleted Stock Warning' }
      );
    } else if (isLowStock) {
      toast.info(`${item.name}: Low ingredient stock (${item.stockAlertMessage}). Order allowed.`, {
        title: 'Low Stock Notice',
      });
    }
    onItemClick(item);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isExplicitlyDisabled}
      style={({ pressed }) => [
        styles.productCard,
        isExplicitlyDisabled && styles.productCardDisabled,
        isLowStock && !isExplicitlyDisabled && styles.productCardLowStock,
        isDepleted && !isExplicitlyDisabled && styles.productCardDepleted,
        pressed && !isExplicitlyDisabled && styles.productCardPressed,
      ]}
    >
      {/* Top Image Banner (height: 110 with smooth fallback) */}
      <View style={styles.imageBannerContainer}>
        {item.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.productImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <CategoryIcon size={32} color="#9ca3af" strokeWidth={1.8} />
          </View>
        )}

        {/* Floating Station Target Tag */}
        <View
          style={[
            styles.stationBadgeFloating,
            item.stationTarget === 'bar' ? styles.badgeBar : styles.badgeKitchen,
          ]}
        >
          <Text
            style={[
              styles.stationBadgeText,
              item.stationTarget === 'bar' ? styles.textBar : styles.textKitchen,
            ]}
          >
            {item.stationTarget === 'bar' ? '☕ BAR' : '🍳 KITCHEN'}
          </Text>
        </View>

        {/* Soft Non-Blocking Low Stock / Depleted Badge */}
        {!isExplicitlyDisabled && isDepleted && (
          <View style={[styles.stockWarningBadge, styles.stockWarningBadgeRose]}>
            <AlertTriangle size={11} color="#be123c" strokeWidth={2.4} />
            <Text style={styles.stockWarningBadgeTextRose}>
              {item.lowestStockIngredient
                ? `Depleted (${item.lowestStockIngredient.currentStock.toFixed(1)}${item.lowestStockIngredient.unit})`
                : 'Depleted Stock'}
            </Text>
          </View>
        )}

        {!isExplicitlyDisabled && !isDepleted && isLowStock && (
          <View style={[styles.stockWarningBadge, styles.stockWarningBadgeAmber]}>
            <AlertCircle size={11} color="#b45309" strokeWidth={2.4} />
            <Text style={styles.stockWarningBadgeTextAmber}>
              {item.lowestStockIngredient
                ? `Low (${item.lowestStockIngredient.currentStock.toFixed(1)}${item.lowestStockIngredient.unit})`
                : 'Low Stock'}
            </Text>
          </View>
        )}
      </View>

      {/* Product Card Body: Name, Price, Description & Badges */}
      <View style={styles.productCardBody}>
        <View style={styles.productTitleRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>{priceLabel}</Text>
        </View>

        <Text style={styles.productDesc} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Dietary & Allergens Row */}
        <View style={styles.badgesRow}>
          {item.dietary.map((d) => (
            <View key={d} style={styles.dietaryPill}>
              <Leaf size={10} color="#15803d" />
              <Text style={styles.dietaryPillText}>{d}</Text>
            </View>
          ))}

          {item.allergens.map((a) => (
            <View key={a} style={styles.allergenPill}>
              <AlertTriangle size={10} color="#b45309" />
              <Text style={styles.allergenPillText}>{a}</Text>
            </View>
          ))}

          {item.isResoldOutsideFood ? (
            <View style={styles.resoldPill}>
              <Text style={styles.resoldPillText}>Outside (+20%)</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* DISABLED OVERLAY (Only if administratively marked unavailable) */}
      {isExplicitlyDisabled ? (
        <View style={styles.soldOutOverlay}>
          <Ban size={22} color="#dc2626" strokeWidth={2.4} />
          <Text style={styles.soldOutTitle}>UNAVAILABLE</Text>
          <Text style={styles.soldOutReason}>
            {item.outOfStockReason || 'Temporarily disabled'}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

export const OrderMenuItemGrid: React.FC<OrderMenuItemGridProps> = ({
  items,
  onItemClick,
  searchQuery = '',
  selectedCategoryLabel = 'this category',
  onClearSearch,
}) => {
  if (items.length === 0) {
    const isSearching = searchQuery.trim().length > 0;
    return (
      <ScrollView
        style={styles.productsScroll}
        contentContainerStyle={[
          styles.productsGrid,
          { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center justify-center max-w-sm px-6 py-10 bg-stone-50 rounded-2xl border border-stone-200/80">
          {isSearching ? (
            <Search size={36} color="#a8a29e" />
          ) : (
            <FolderPlus size={36} color="#a8a29e" />
          )}
          <Text className="mt-3 text-base font-bold text-stone-800 text-center">
            {isSearching
              ? `No dishes or drinks match "${searchQuery.trim()}"`
              : `No menu items in "${selectedCategoryLabel}" yet`}
          </Text>
          <Text className="mt-1 text-xs text-stone-500 text-center leading-relaxed">
            {isSearching
              ? 'Check the spelling or try searching for another menu item.'
              : 'Products assigned to this category in Admin Back-Office > Menu Recipes will appear here.'}
          </Text>
          {isSearching && onClearSearch ? (
            <Pressable
              onPress={onClearSearch}
              className="mt-4 px-4 py-2 bg-stone-200 active:bg-stone-300 rounded-lg"
              accessibilityRole="button"
              accessibilityLabel="Clear search filter"
            >
              <Text className="text-xs font-bold text-stone-700">Clear Search</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.productsScroll}
      contentContainerStyle={styles.productsGrid}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} onItemClick={onItemClick} />
      ))}
    </ScrollView>
  );
};
