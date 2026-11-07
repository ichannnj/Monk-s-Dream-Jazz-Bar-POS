import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import {
  UtensilsCrossed,
  Coffee,
  Wine,
  Pizza,
  Cake,
  Camera,
  Leaf,
  AlertTriangle,
  AlertCircle,
  Ban,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { MenuItem } from '../../../../types/floor';
import { styles } from './OrderEntryModal.styles';

export interface OrderMenuItemGridProps {
  items: MenuItem[];
  isAdmin: boolean;
  onItemClick: (item: MenuItem) => void;
  onOpenImageEditor: (item: MenuItem) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'coffee':
      return Coffee;
    case 'cocktails_wine':
      return Wine;
    case 'mains_pasta':
      return Pizza;
    case 'small_plates':
      return UtensilsCrossed;
    case 'desserts':
      return Cake;
    default:
      return UtensilsCrossed;
  }
};

const MenuItemCard: React.FC<{
  item: MenuItem;
  isAdmin: boolean;
  onItemClick: (item: MenuItem) => void;
  onOpenImageEditor: (item: MenuItem) => void;
}> = ({ item, isAdmin, onItemClick, onOpenImageEditor }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const isExplicitlyDisabled = !item.isAvailable;
  const isDepleted = item.stockStatus === 'depleted';
  const isLowStock = item.stockStatus === 'low_stock';
  const CategoryIcon = getCategoryIcon(item.category);

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

        {/* Admin Camera / Edit Image Button */}
        {isAdmin && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onOpenImageEditor(item);
            }}
            style={styles.adminEditImageBtn}
            accessibilityRole="button"
            accessibilityLabel={`Change photo for ${item.name}`}
          >
            <Camera size={13} color="#ffffff" strokeWidth={2.4} />
          </Pressable>
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
  isAdmin,
  onItemClick,
  onOpenImageEditor,
}) => {
  return (
    <ScrollView
      style={styles.productsScroll}
      contentContainerStyle={styles.productsGrid}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          isAdmin={isAdmin}
          onItemClick={onItemClick}
          onOpenImageEditor={onOpenImageEditor}
        />
      ))}
    </ScrollView>
  );
};
