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
  Ban,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
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
  const isSoldOut = !item.isAvailable || item.auto86;
  const CategoryIcon = getCategoryIcon(item.category);

  // Step 4.3: Resold outside food +20% locked price calculation
  const displayPrice =
    item.isResoldOutsideFood && item.originalCost ? item.originalCost * 1.2 : item.price;

  return (
    <Pressable
      onPress={() => onItemClick(item)}
      disabled={isSoldOut}
      style={({ pressed }) => [
        styles.productCard,
        isSoldOut && styles.productCardDisabled,
        pressed && !isSoldOut && styles.productCardPressed,
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
          <Text style={styles.productPrice}>{formatCurrency(displayPrice)}</Text>
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

      {/* SOLD OUT OVERLAY (86 Safeguard) */}
      {isSoldOut ? (
        <View style={styles.soldOutOverlay}>
          <Ban size={22} color="#dc2626" strokeWidth={2.4} />
          <Text style={styles.soldOutTitle}>SOLD OUT (86)</Text>
          <Text style={styles.soldOutReason}>{item.outOfStockReason || 'Ingredient Depleted'}</Text>
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
