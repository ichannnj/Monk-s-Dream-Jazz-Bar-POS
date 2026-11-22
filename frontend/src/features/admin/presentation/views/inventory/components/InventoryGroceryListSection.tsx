import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import {
  ShoppingBag,
  ExternalLink,
  Copy,
  Phone,
  Plus,
  Camera,
  CheckCircle2,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, type PosDropdownOption } from '@/features/shared';
import type { InventoryItemAdmin, SupplierAdmin } from '../../../../data/admin.api';
import { calculateSuggestedBuyQty, getStockStatus } from '../utils/inventoryCalculations';
import type { PhotoLightboxData } from './PhotoLightboxModal';

interface InventoryGroceryListSectionProps {
  items: InventoryItemAdmin[];
  suppliers: SupplierAdmin[];
  onRestock: (item: InventoryItemAdmin) => void;
  onEditItem: (item: InventoryItemAdmin) => void;
  onPreviewPhoto: (photo: PhotoLightboxData) => void;
}

export const InventoryGroceryListSection: React.FC<InventoryGroceryListSectionProps> = ({
  items,
  suppliers,
  onRestock,
  onEditItem,
  onPreviewPhoto,
}) => {
  const [supplierFilter, setSupplierFilter] = useState('ALL');

  const supplierOptions: PosDropdownOption<string>[] = [
    { value: 'ALL', label: 'All Suppliers' },
    { value: 'UNASSIGNED', label: 'No Assigned Supplier' },
    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
  ];

  const filteredItems = useMemo(() => {
    if (supplierFilter === 'ALL') return items;
    if (supplierFilter === 'UNASSIGNED') {
      return items.filter((i) => !i.supplier_id && !i.supplier?.id);
    }
    return items.filter(
      (i) => i.supplier_id === supplierFilter || i.supplier?.id === supplierFilter
    );
  }, [items, supplierFilter]);

  const handleOpenMobileView = () => {
    if (typeof window !== 'undefined') {
      window.open('?mode=grocery', '_blank');
    }
  };

  const handleCopyMobileLink = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?mode=grocery`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Copied mobile grocery link to clipboard', { title: 'Link Copied' });
    } catch {
      toast.info(url, { title: 'Mobile Grocery URL' });
    }
  };

  return (
    <View className="gap-4">
      {/* Toolbar */}
      <View className="rounded-2xl border border-[#E2DED6] bg-white p-4 flex-col md:flex-row md:items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#1A1617]">
            Grocery &amp; Restock List ({filteredItems.length})
          </Text>
          <Text className="text-base text-[#78716C]">
            Items at or below par level with reference photos for store runs.
          </Text>
        </View>

        <View className="flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <View className="w-full sm:w-52">
            <PosDropdown
              mode="select"
              options={supplierOptions}
              value={supplierFilter}
              onChange={setSupplierFilter}
            />
          </View>

          <Pressable
            onPress={handleCopyMobileLink}
            className="min-h-[48px] px-4 rounded-xl border border-[#E2DED6] bg-white flex-row items-center justify-center active:opacity-80"
          >
            <Copy size={18} color="#1A1617" />
            <Text className="ml-2 text-base font-bold text-[#1A1617]">Copy Link</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenMobileView}
            className="min-h-[48px] px-4 rounded-xl bg-[#810021] flex-row items-center justify-center active:opacity-85"
          >
            <ExternalLink size={18} color="#F7F5F2" />
            <Text className="ml-2 text-base font-bold text-white">Mobile View</Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      {filteredItems.length === 0 ? (
        <View className="rounded-2xl border border-[#E2DED6] bg-white p-12 items-center justify-center">
          <CheckCircle2 size={40} color="#10b981" />
          <Text className="mt-3 text-lg font-bold text-[#1A1617] text-center">
            All inventory items are above par.
          </Text>
          <Text className="mt-1 text-base text-[#78716C] text-center">
            Nothing needs to be purchased right now.
          </Text>
        </View>
      ) : (
        <View className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.current_stock, item.min_alert_level);
            const isOut = status === 'DEPLETED';
            const buyQty = calculateSuggestedBuyQty(
              item.current_stock,
              item.min_alert_level,
              item.target_stock_level
            );
            const supplierPhone = item.supplier?.phone;

            return (
              <View
                key={item.id}
                className="rounded-2xl border border-[#E2DED6] bg-white overflow-hidden flex-col justify-between"
              >
                <View>
                  {/* Reference Photo Banner */}
                  {item.reference_image_url ? (
                    <Pressable
                      onPress={() =>
                        onPreviewPhoto({
                          url: item.reference_image_url!,
                          title: item.name,
                          subtitle: `Buy ${buyQty} ${item.unit} • On-hand: ${Number(item.current_stock || 0).toFixed(2)} ${item.unit}`,
                          note: item.grocery_note,
                        })
                      }
                      className="h-44 w-full bg-[#EFECE6] border-b border-[#E2DED6] active:opacity-90"
                    >
                      <Image
                        source={{ uri: item.reference_image_url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => onEditItem(item)}
                      className="h-28 w-full bg-[#EFECE6] border-b border-[#E2DED6] items-center justify-center gap-1 active:opacity-80"
                    >
                      <Camera size={22} color="#78716C" />
                      <Text className="text-base font-semibold text-[#78716C]">
                        Tap to attach reference photo
                      </Text>
                    </Pressable>
                  )}

                  <View className="p-4 gap-2.5">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1 min-w-0">
                        <Text className="text-lg font-bold text-[#1A1617]">{item.name}</Text>
                        <Text className="text-base text-[#78716C] tabular-nums">
                          On-hand: {Number(item.current_stock || 0).toFixed(2)} {item.unit} (Par{' '}
                          {item.min_alert_level})
                        </Text>
                      </View>
                      <View
                        className={`rounded-lg px-2.5 py-1 border ${
                          isOut ? 'bg-rose-50 border-rose-200' : 'bg-[#EFECE6] border-[#E2DED6]'
                        }`}
                      >
                        <Text
                          className={`text-base font-bold ${
                            isOut ? 'text-[#b32638]' : 'text-[#810021]'
                          }`}
                        >
                          {isOut ? 'Out' : 'Low'}
                        </Text>
                      </View>
                    </View>

                    {/* Buy Qty Highlight */}
                    <View className="rounded-xl bg-[#EFECE6] border border-[#E2DED6] px-3.5 py-2.5 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <ShoppingBag size={18} color="#810021" />
                        <Text className="text-base font-semibold text-[#1A1617]">Buy Qty</Text>
                      </View>
                      <Text className="text-lg font-extrabold text-[#810021] tabular-nums">
                        {buyQty} {item.unit}
                      </Text>
                    </View>

                    {item.grocery_note ? (
                      <Text className="text-base text-[#1A1617]">{item.grocery_note}</Text>
                    ) : null}

                    {(item.supplier?.name || item.supplier_name) && (
                      <View className="flex-row items-center justify-between gap-2 pt-1">
                        <Text className="text-base text-[#78716C] flex-1" numberOfLines={1}>
                          Vendor: {item.supplier?.name || item.supplier_name}
                        </Text>
                        {supplierPhone ? (
                          <Pressable
                            onPress={() => Linking.openURL(`tel:${supplierPhone}`)}
                            className="min-h-[48px] px-3 rounded-xl border border-[#E2DED6] bg-white flex-row items-center active:opacity-80"
                          >
                            <Phone size={16} color="#810021" />
                            <Text className="ml-1.5 text-base font-bold text-[#810021]">Call</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>

                <View className="px-4 pb-4 pt-2 border-t border-[#E2DED6] flex-row items-center gap-2">
                  <Pressable
                    onPress={() => onEditItem(item)}
                    className="min-h-[48px] px-4 rounded-xl border border-[#E2DED6] bg-white items-center justify-center active:opacity-80"
                  >
                    <Text className="text-base font-bold text-[#1A1617]">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onRestock(item)}
                    className="min-h-[48px] flex-1 rounded-xl bg-[#810021] flex-row items-center justify-center active:opacity-85"
                  >
                    <Plus size={18} color="#F7F5F2" />
                    <Text className="ml-1.5 text-base font-bold text-white">Restock</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
