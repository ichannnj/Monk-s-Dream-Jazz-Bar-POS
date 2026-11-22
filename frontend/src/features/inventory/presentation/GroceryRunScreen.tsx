import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import {
  ShoppingBag,
  Search,
  Phone,
  Check,
  Lock,
  LogOut,
  Camera,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import { authApi } from '@/features/auth/data/auth.api';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { AdminInput } from '@/features/admin/presentation/components/AdminInput';
import { inventoryStockApi } from '@/features/admin/data/api/inventoryStock.api';
import type { InventoryItemAdmin } from '@/features/admin/data/admin.types';
import {
  calculateSuggestedBuyQty,
  getStockStatus,
} from '@/features/admin/presentation/views/inventory/utils/inventoryCalculations';
import {
  PhotoLightboxModal,
  type PhotoLightboxData,
} from '@/features/admin/presentation/views/inventory/components/PhotoLightboxModal';

function getManilaDateKey(): string {
  try {
    const now = new Date();
    const manila = new Date(now.getTime() + 8 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000);
    return manila.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const GroceryRunScreen: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [verifiedStaffName, setVerifiedStaffName] = useState<string | null>(
    currentUser?.displayName || null
  );

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [items, setItems] = useState<InventoryItemAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState<'REMAINING' | 'ALL' | 'BASKET'>('REMAINING');
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoLightboxData | null>(null);

  const storageKey = `monks_grocery_basket_${getManilaDateKey()}`;
  const [basketIds, setBasketIds] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (currentUser?.displayName) {
      setVerifiedStaffName(currentUser.displayName);
    }
  }, [currentUser]);

  const toggleBasket = (itemId: string) => {
    setBasketIds((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
      }
      return next;
    });
  };

  const loadLowStockItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await inventoryStockApi.getInventoryItems();
      const low = all
        .filter((i) => getStockStatus(i.current_stock, i.min_alert_level) !== 'IN_PAR')
        .sort((a, b) => {
          const aOut = Number(a.current_stock || 0) <= 0 ? 0 : 1;
          const bOut = Number(b.current_stock || 0) <= 0 ? 0 : 1;
          if (aOut !== bOut) return aOut - bOut;
          return a.name.localeCompare(b.name);
        });
      setItems(low);
    } catch {
      // silent retry via realtime/manual refresh
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!verifiedStaffName) return;
    loadLowStockItems();

    const channel = supabase
      .channel('grocery_run_inventory_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        loadLowStockItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [verifiedStaffName, loadLowStockItems]);

  const handlePinUnlock = async () => {
    if (!username.trim() || pin.trim().length < 4) {
      setAuthError('Enter your Staff Username and 4-digit PIN.');
      return;
    }

    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const res = await authApi.loginWithCredentials(username.trim(), pin.trim());
      if (!res.success || !res.user) {
        setAuthError(res.error || 'Invalid Staff Username or PIN.');
        return;
      }
      setVerifiedStaffName(res.user.displayName);
      setPin('');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.grocery_note || '').toLowerCase().includes(q) ||
        (item.supplier?.name || '').toLowerCase().includes(q);
      const inBasket = Boolean(basketIds[item.id]);
      if (showFilter === 'REMAINING') return matchesSearch && !inBasket;
      if (showFilter === 'BASKET') return matchesSearch && inBasket;
      return matchesSearch;
    });
  }, [items, searchQuery, showFilter, basketIds]);

  const inBasketCount = items.filter((i) => basketIds[i.id]).length;
  const remainingCount = items.length - inBasketCount;

  if (!verifiedStaffName) {
    return (
      <View className="flex-1 bg-[#FAF8F5] items-center justify-center p-4">
        <View className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-6 gap-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center">
              <Lock size={22} color="#810021" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-[#1C1917]">Grocery Run</Text>
              <Text className="text-base text-[#78716C]">
                Sign in with your staff PIN to view items to buy
              </Text>
            </View>
          </View>

          <AdminInput
            label="Staff Username"
            value={username}
            onChangeText={(v) => {
              setAuthError(null);
              setUsername(v);
            }}
            placeholder="e.g. waiter"
            autoCapitalize="none"
            clearable
          />

          <AdminInput
            label="4-Digit PIN"
            value={pin}
            onChangeText={(v) => {
              setAuthError(null);
              setPin(v.replace(/[^0-9]/g, '').slice(0, 4));
            }}
            placeholder="••••"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          {authError && (
            <View className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
              <Text className="text-base font-semibold text-[#b32638]">{authError}</Text>
            </View>
          )}

          <Pressable
            onPress={handlePinUnlock}
            disabled={isAuthenticating}
            className="min-h-[48px] rounded-xl bg-[#810021] items-center justify-center active:opacity-85"
          >
            <Text className="text-base font-bold text-white">
              {isAuthenticating ? 'Verifying...' : 'Open Grocery List'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAF8F5]">
      {/* Sticky Top Header */}
      <View className="bg-white border-b border-[#E7E5E4] px-4 py-3.5 gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
            <ShoppingBag size={22} color="#810021" />
            <View className="flex-1 min-w-0">
              <Text className="text-lg font-extrabold text-[#1C1917]" numberOfLines={1}>
                Grocery List
              </Text>
              <Text className="text-base text-[#78716C]" numberOfLines={1}>
                {verifiedStaffName} • {remainingCount} left to buy
              </Text>
            </View>
          </View>

          {!currentUser && (
            <Pressable
              onPress={() => setVerifiedStaffName(null)}
              className="min-h-[48px] min-w-[48px] px-3 rounded-xl border border-[#E7E5E4] bg-white flex-row items-center justify-center active:opacity-80"
              accessibilityLabel="Lock grocery list"
            >
              <LogOut size={18} color="#1C1917" />
            </Pressable>
          )}
        </View>

        <AdminInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items, brand notes, suppliers..."
          leftElement={<Search size={18} color="#78716C" />}
          clearable
        />

        <View className="flex-row items-center gap-2">
          {(
            [
              { key: 'REMAINING', label: `To Buy (${remainingCount})` },
              { key: 'BASKET', label: `In Basket (${inBasketCount})` },
              { key: 'ALL', label: `All (${items.length})` },
            ] as const
          ).map((tab) => {
            const isActive = showFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setShowFilter(tab.key)}
                className={`min-h-[48px] flex-1 px-2 rounded-xl border items-center justify-center ${
                  isActive ? 'bg-[#810021] border-[#810021]' : 'bg-white border-[#E7E5E4]'
                }`}
              >
                <Text
                  className={`text-base font-bold tabular-nums ${
                    isActive ? 'text-white' : 'text-[#1C1917]'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && items.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#810021" />
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="rounded-2xl border border-[#E7E5E4] bg-white p-10 items-center justify-center">
            <CheckCircle2 size={36} color="#10b981" />
            <Text className="mt-3 text-lg font-bold text-[#1C1917] text-center">
              {items.length === 0 ? 'Everything is stocked above par.' : 'No items in this view.'}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const inBasket = Boolean(basketIds[item.id]);
            const isOut = Number(item.current_stock || 0) <= 0;
            const buyQty = calculateSuggestedBuyQty(
              item.current_stock,
              item.min_alert_level,
              item.target_stock_level
            );
            const supplierPhone = item.supplier?.phone;

            return (
              <View
                key={item.id}
                className={`rounded-2xl border bg-white overflow-hidden ${
                  inBasket ? 'border-[#E7E5E4] opacity-75' : 'border-[#E7E5E4]'
                }`}
              >
                {item.reference_image_url ? (
                  <Pressable
                    onPress={() =>
                      setLightboxPhoto({
                        url: item.reference_image_url!,
                        title: item.name,
                        subtitle: `Buy ${buyQty} ${item.unit}`,
                        note: item.grocery_note,
                      })
                    }
                    className="h-48 w-full bg-[#FAF8F5] border-b border-[#E7E5E4]"
                  >
                    <Image
                      source={{ uri: item.reference_image_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </Pressable>
                ) : (
                  <View className="h-20 w-full bg-[#FAF8F5] border-b border-[#E7E5E4] flex-row items-center justify-center gap-2">
                    <Camera size={18} color="#78716C" />
                    <Text className="text-base text-[#78716C]">No reference photo</Text>
                  </View>
                )}

                <View className="p-4 gap-3">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 min-w-0">
                      <Text className="text-lg font-bold text-[#1C1917]">{item.name}</Text>
                      <Text className="text-base text-[#78716C] tabular-nums">
                        On-hand: {Number(item.current_stock || 0).toFixed(2)} {item.unit}
                      </Text>
                    </View>
                    <View
                      className={`rounded-lg px-2.5 py-1 border ${
                        isOut ? 'bg-rose-50 border-rose-200' : 'bg-[#FAF8F5] border-[#E7E5E4]'
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

                  <View className="rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] px-3.5 py-2.5 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-[#1C1917]">Buy Qty</Text>
                    <Text className="text-lg font-extrabold text-[#810021] tabular-nums">
                      {buyQty} {item.unit}
                    </Text>
                  </View>

                  {item.grocery_note ? (
                    <Text className="text-base text-[#1C1917]">{item.grocery_note}</Text>
                  ) : null}

                  <View className="flex-row items-center gap-2 pt-1">
                    {supplierPhone ? (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${supplierPhone}`)}
                        className="min-h-[48px] px-4 rounded-xl border border-[#E7E5E4] bg-white flex-row items-center justify-center active:opacity-80"
                      >
                        <Phone size={18} color="#810021" />
                        <Text className="ml-1.5 text-base font-bold text-[#810021]">Call</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => toggleBasket(item.id)}
                      className={`min-h-[48px] flex-1 rounded-xl flex-row items-center justify-center border ${
                        inBasket ? 'bg-[#FAF8F5] border-[#E7E5E4]' : 'bg-[#810021] border-[#810021]'
                      }`}
                    >
                      <Check size={18} color={inBasket ? '#10b981' : '#FFFFFF'} />
                      <Text
                        className={`ml-2 text-base font-bold ${
                          inBasket ? 'text-[#1C1917]' : 'text-white'
                        }`}
                      >
                        {inBasket ? 'In Basket' : 'Mark In Basket'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PhotoLightboxModal photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </View>
  );
};
