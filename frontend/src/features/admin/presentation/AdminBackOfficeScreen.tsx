import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import {
  ShieldAlert,
  Sun,
  Flame,
  Package,
  Layers,
  Users,
  BarChart3,
  LogOut,
  RefreshCw,
  Plus,
  TrendingUp,
} from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  adminApi,
  type InventoryItemAdmin,
  type ProductAdmin,
  type SalesAnalyticsOverview,
} from '../data/admin.api';

type AdminTab = 'analytics' | 'inventory' | 'recipes' | 'staff';

export const AdminBackOfficeScreen: React.FC<{ onSwitchToFloor?: () => void }> = ({
  onSwitchToFloor,
}) => {
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [operatingMode, setOperatingMode] = useState<'CAFE' | 'EVENT'>('CAFE');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [analytics, setAnalytics] = useState<SalesAnalyticsOverview | null>(null);
  const [inventory, setInventory] = useState<InventoryItemAdmin[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);

  // Restock modal state
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItemAdmin | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settings, inv, prod, anal] = await Promise.all([
        adminApi.getVenueSettings(),
        adminApi.getInventoryItems(),
        adminApi.getProductsWithBOM(),
        adminApi.getSalesOverview(),
      ]);
      setOperatingMode(settings.operating_mode);
      setInventory(inv);
      setProducts(prod);
      setAnalytics(anal);
    } catch {
      toast.error('Failed to load administrative back-office data', { title: 'Admin Error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMode = async () => {
    const nextMode = operatingMode === 'CAFE' ? 'EVENT' : 'CAFE';
    try {
      await adminApi.setOperatingMode(nextMode);
      setOperatingMode(nextMode);
      toast.success(
        nextMode === 'EVENT'
          ? '🎷 Event Mode Activated! Orders tagged for Live Jazz Set.'
          : '☀️ Daytime Cafe Mode Activated!',
        { title: 'Operating Mode Updated' }
      );
    } catch {
      toast.error('Failed to switch operating mode', { title: 'Update Error' });
    }
  };

  const handleExecuteRestock = async () => {
    if (!selectedRestockItem || !restockQty || !restockCost) return;
    try {
      await adminApi.restockDelivery({
        inventoryItemId: selectedRestockItem.id,
        quantity: parseFloat(restockQty),
        invoiceUnitCost: parseFloat(restockCost),
      });
      toast.success(`Restocked ${selectedRestockItem.name} with updated Weighted MAC`, {
        title: 'Delivery Received',
      });
      setSelectedRestockItem(null);
      setRestockQty('');
      setRestockCost('');
      loadData();
    } catch {
      toast.error('Failed to record restock delivery', { title: 'Restock Error' });
    }
  };

  return (
    <View className="flex-1 bg-stone-100">
      {/* Top Header */}
      <View className="flex-row items-center justify-between border-b border-stone-200 bg-white px-6 py-4 shadow-sm">
        <View className="flex-row items-center space-x-3">
          <View className="rounded-xl bg-amber-500 p-2.5">
            <ShieldAlert size={24} color="#ffffff" />
          </View>
          <View className="ml-3">
            <Text className="text-xl font-black text-stone-900">Monk's Dream • Back-Office</Text>
            <Text className="text-base font-medium text-stone-500">
              Managerial Administration & Analytics Hub
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-3">
          {/* Operating Mode Switcher */}
          <Pressable
            onPress={handleToggleMode}
            className={`min-h-[48px] min-w-[48px] flex-row items-center rounded-xl px-4 py-2.5 shadow-sm active:opacity-80 ${
              operatingMode === 'EVENT' ? 'bg-amber-600' : 'bg-sky-600'
            }`}
          >
            {operatingMode === 'EVENT' ? (
              <Flame size={20} color="#ffffff" />
            ) : (
              <Sun size={20} color="#ffffff" />
            )}
            <Text className="ml-2 text-base font-bold text-white">
              {operatingMode === 'EVENT' ? '🎷 Event Mode Active' : '☀️ Cafe Mode Active'}
            </Text>
          </Pressable>

          {/* Switch to Floor POS Button */}
          {onSwitchToFloor && (
            <Pressable
              onPress={onSwitchToFloor}
              className="min-h-[48px] min-w-[48px] flex-row items-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 active:bg-stone-50"
            >
              <Layers size={18} color="#44403c" />
              <Text className="ml-2 text-base font-semibold text-stone-800">Floor Workspace</Text>
            </Pressable>
          )}

          {/* Logout Button */}
          <Pressable
            onPress={logout}
            className="min-h-[48px] min-w-[48px] flex-row items-center rounded-xl bg-stone-100 px-4 py-2.5 active:bg-stone-200"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="ml-2 text-base font-semibold text-red-600">Lock</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Tabs Navigation */}
      <View className="flex-row border-b border-stone-200 bg-white px-6">
        <Pressable
          onPress={() => setActiveTab('analytics')}
          className={`mr-8 min-h-[48px] flex-row items-center border-b-2 py-3 ${
            activeTab === 'analytics' ? 'border-amber-600' : 'border-transparent'
          }`}
        >
          <BarChart3 size={20} color={activeTab === 'analytics' ? '#d97706' : '#78716c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              activeTab === 'analytics' ? 'text-amber-800' : 'text-stone-500'
            }`}
          >
            Sales & Net Profit
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('inventory')}
          className={`mr-8 min-h-[48px] flex-row items-center border-b-2 py-3 ${
            activeTab === 'inventory' ? 'border-amber-600' : 'border-transparent'
          }`}
        >
          <Package size={20} color={activeTab === 'inventory' ? '#d97706' : '#78716c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              activeTab === 'inventory' ? 'text-amber-800' : 'text-stone-500'
            }`}
          >
            Inventory Hub (MAC)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('recipes')}
          className={`mr-8 min-h-[48px] flex-row items-center border-b-2 py-3 ${
            activeTab === 'recipes' ? 'border-amber-600' : 'border-transparent'
          }`}
        >
          <Layers size={20} color={activeTab === 'recipes' ? '#d97706' : '#78716c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              activeTab === 'recipes' ? 'text-amber-800' : 'text-stone-500'
            }`}
          >
            Recipe BOM & +20% Food
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('staff')}
          className={`min-h-[48px] flex-row items-center border-b-2 py-3 ${
            activeTab === 'staff' ? 'border-amber-600' : 'border-transparent'
          }`}
        >
          <Users size={20} color={activeTab === 'staff' ? '#d97706' : '#78716c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              activeTab === 'staff' ? 'text-amber-800' : 'text-stone-500'
            }`}
          >
            Staff Salary & Add-ons
          </Text>
        </Pressable>
      </View>

      {/* Tab Contents */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d97706" />
          <Text className="mt-4 text-base text-stone-600">Loading Back-Office suite...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          {activeTab === 'analytics' && (
            <View className="space-y-6">
              {/* Metric Cards Row */}
              <View className="flex-row space-x-4">
                <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <Text className="text-base font-medium text-stone-500">Gross Revenue</Text>
                  <Text className="mt-2 text-3xl font-black text-stone-900">
                    PHP {(analytics?.grossSales || 0).toFixed(2)}
                  </Text>
                  <Text className="mt-1 text-base text-emerald-600">
                    {analytics?.orderCount || 0} Settled Orders
                  </Text>
                </View>

                <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <Text className="text-base font-medium text-stone-500">Avg Ticket Size</Text>
                  <Text className="mt-2 text-3xl font-black text-stone-900">
                    PHP {(analytics?.averageTicket || 0).toFixed(2)}
                  </Text>
                  <Text className="mt-1 text-base text-stone-500">Per Customer Tab</Text>
                </View>

                <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <Text className="text-base font-medium text-stone-500">Est. Net Profit</Text>
                  <Text className="mt-2 text-3xl font-black text-amber-700">
                    PHP {(analytics?.estimatedNetProfit || 0).toFixed(2)}
                  </Text>
                  <Text className="mt-1 text-base text-stone-500">After COGS & Overhead</Text>
                </View>
              </View>

              {/* Channel Breakdown Table */}
              <View className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-xl font-bold text-stone-900">
                    Multi-Channel Sales Breakdown
                  </Text>
                  <Pressable
                    onPress={loadData}
                    className="min-h-[48px] min-w-[48px] flex-row items-center rounded-lg bg-stone-100 px-3 py-1.5"
                  >
                    <RefreshCw size={16} color="#44403c" />
                    <Text className="ml-1 text-base font-medium text-stone-700">Refresh</Text>
                  </Pressable>
                </View>

                {Object.entries(analytics?.channelBreakdown || {}).map(([channel, data]) => (
                  <View
                    key={channel}
                    className="flex-row items-center justify-between border-b border-stone-100 py-3"
                  >
                    <Text className="text-base font-semibold text-stone-800">
                      {channel.replace('_', ' ')}
                    </Text>
                    <View className="flex-row items-center space-x-6">
                      <Text className="text-base text-stone-500">{data.count} orders</Text>
                      <Text className="text-base font-bold text-stone-900">
                        PHP {data.sales.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'inventory' && (
            <View className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-stone-900">
                  On-Hand Stock & Moving Average Cost (MAC)
                </Text>
              </View>

              {inventory.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between border-b border-stone-100 py-4"
                >
                  <View>
                    <Text className="text-lg font-bold text-stone-900">{item.name}</Text>
                    <Text className="text-base text-stone-500">
                      SKU: {item.sku} • Category: {item.category}
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-4">
                    <View className="items-end">
                      <Text className="text-base font-bold text-stone-900">
                        {item.current_stock} {item.unit}
                      </Text>
                      <Text className="text-base text-stone-500">
                        MAC: PHP {item.unit_cost.toFixed(2)}/{item.unit}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setSelectedRestockItem(item)}
                      className="min-h-[48px] min-w-[48px] flex-row items-center rounded-xl bg-amber-500 px-4 py-2 active:bg-amber-600"
                    >
                      <Plus size={16} color="#ffffff" />
                      <Text className="ml-1 text-base font-bold text-white">Restock Intake</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'recipes' && (
            <View className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <Text className="text-xl font-bold text-stone-900">
                Recipe Bill of Materials (BOM) & Outside Food Pricing
              </Text>
              <Text className="mt-1 text-base text-stone-500">
                Ingredients auto-deplete on order dispatch. Outside food enforces locked +20%
                markup.
              </Text>

              <View className="mt-6 space-y-4">
                {products.map((prod) => (
                  <View
                    key={prod.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-lg font-bold text-stone-900">{prod.name}</Text>
                        <Text className="text-base text-stone-600">
                          Base Price: PHP {prod.base_price.toFixed(2)}
                          {prod.is_resold_outside_food && (
                            <Text className="font-bold text-amber-700">
                              {' '}
                              • [Outside Food +20% Locked]
                            </Text>
                          )}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-3 py-1 ${
                          prod.auto_86 ? 'bg-rose-100' : 'bg-emerald-100'
                        }`}
                      >
                        <Text
                          className={`text-base font-medium ${
                            prod.auto_86 ? 'text-rose-800' : 'text-emerald-800'
                          }`}
                        >
                          {prod.auto_86 ? 'Auto-86 Disabled' : 'Available'}
                        </Text>
                      </View>
                    </View>

                    {prod.ingredients && prod.ingredients.length > 0 && (
                      <View className="mt-3 border-t border-stone-200 pt-2">
                        <Text className="text-base font-semibold text-stone-700">
                          Ingredients BOM:
                        </Text>
                        {prod.ingredients.map((ing) => (
                          <Text key={ing.id} className="text-base text-stone-600">
                            • {ing.inventory_item?.name || 'Item'} ({ing.amount} {ing.unit})
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'staff' && (
            <View className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <Text className="text-xl font-bold text-stone-900">
                Staff Daily Salary Suite & Discretionary Shift Add-ons
              </Text>
              <Text className="mt-1 text-base text-stone-500">
                Includes workflow staff (PIN clock-in) and non-workflow venue staff.
              </Text>

              <View className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <Text className="text-base text-stone-700">
                  Daily minimum rate baseline: <Text className="font-bold">PHP 50.00/shift</Text>.
                  Managers can add discretionary jazz night performance bonuses per shift.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Restock Delivery Intake Modal */}
      {selectedRestockItem && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <Text className="text-2xl font-bold text-stone-900">
              Restock Intake: {selectedRestockItem.name}
            </Text>
            <Text className="mt-1 text-base text-stone-500">
              Current Stock: {selectedRestockItem.current_stock} {selectedRestockItem.unit} •
              Current MAC: PHP {selectedRestockItem.unit_cost.toFixed(2)}
            </Text>

            <View className="mt-6 space-y-4">
              <View>
                <Text className="text-base font-medium text-stone-700">
                  Received Quantity ({selectedRestockItem.unit}):
                </Text>
                <TextInput
                  value={restockQty}
                  onChangeText={setRestockQty}
                  keyboardType="numeric"
                  placeholder="e.g. 10"
                  className="mt-1 rounded-xl border border-stone-300 p-3 text-base"
                />
              </View>

              <View>
                <Text className="text-base font-medium text-stone-700">
                  Invoice Unit Cost (PHP):
                </Text>
                <TextInput
                  value={restockCost}
                  onChangeText={setRestockCost}
                  keyboardType="numeric"
                  placeholder="e.g. 25.50"
                  className="mt-1 rounded-xl border border-stone-300 p-3 text-base"
                />
              </View>
            </View>

            <View className="mt-6 flex-row justify-end space-x-3">
              <Pressable
                onPress={() => setSelectedRestockItem(null)}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-stone-200 px-5 py-2.5 active:bg-stone-300"
              >
                <Text className="text-base font-semibold text-stone-800">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleExecuteRestock}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-amber-600 px-5 py-2.5 active:bg-amber-700"
              >
                <Text className="text-base font-bold text-white">Record & Recalculate MAC</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
