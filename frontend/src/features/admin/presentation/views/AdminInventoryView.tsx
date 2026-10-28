import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Plus, Package } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../data/admin.api';

interface AdminInventoryViewProps {
  inventory: InventoryItemAdmin[];
  onRefresh: () => void;
}

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({ inventory, onRefresh }) => {
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItemAdmin | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExecuteRestock = async () => {
    if (!selectedRestockItem || !restockQty || !restockCost) return;
    setIsSubmitting(true);
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
      onRefresh();
    } catch {
      toast.error('Failed to record restock delivery', { title: 'Restock Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
            Inventory Hub & Moving Average Cost (MAC)
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            Automatic inventory depletion on order dispatch with live par alerts
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <View className="space-y-4">
          {inventory.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Package size={36} color="#a8a29e" />
              <Text className="mt-2 text-base text-stone-500">
                No inventory items configured in database.
              </Text>
            </View>
          ) : (
            inventory.map((item) => {
              const isBelowPar = item.current_stock <= item.min_alert_level;
              return (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between border-b border-stone-100 py-4"
                >
                  <View>
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-lg font-bold text-stone-900">{item.name}</Text>
                      {isBelowPar && (
                        <View className="ml-2 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5">
                          <Text className="text-xs font-bold text-amber-800">Below Par</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-stone-500">
                      SKU: {item.sku} • Category: {item.category} • Par: {item.min_alert_level}{' '}
                      {item.unit}
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-5">
                    <View className="items-end mr-4">
                      <Text
                        className={`text-base font-bold ${
                          isBelowPar ? 'text-amber-700' : 'text-stone-900'
                        }`}
                      >
                        {item.current_stock} {item.unit}
                      </Text>
                      <Text className="text-xs text-stone-500">
                        MAC: ₱{item.unit_cost.toFixed(2)}/{item.unit}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setSelectedRestockItem(item)}
                      className="min-h-[40px] flex-row items-center rounded-xl bg-[#800020] px-3.5 py-2 active:opacity-90"
                    >
                      <Plus size={15} color="#ffffff" />
                      <Text className="ml-1 text-sm font-semibold text-white">Restock Intake</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Restock Delivery Intake Modal */}
      {selectedRestockItem && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 p-6 z-50">
          <View className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <Text className="text-2xl font-bold text-stone-900">
              Restock Intake: {selectedRestockItem.name}
            </Text>
            <Text className="mt-1 text-sm text-stone-500">
              Current Stock: {selectedRestockItem.current_stock} {selectedRestockItem.unit} •
              Current MAC: ₱{selectedRestockItem.unit_cost.toFixed(2)}
            </Text>

            <View className="mt-6 space-y-4">
              <View>
                <Text className="text-sm font-medium text-stone-700">
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
                <Text className="text-sm font-medium text-stone-700">Invoice Unit Cost (₱):</Text>
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
                className="rounded-xl bg-stone-100 px-4 py-2.5 active:bg-stone-200"
              >
                <Text className="text-sm font-semibold text-stone-700">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleExecuteRestock}
                disabled={isSubmitting}
                className="rounded-xl bg-[#800020] px-5 py-2.5 active:opacity-90"
              >
                <Text className="text-sm font-bold text-white">
                  {isSubmitting ? 'Recording...' : 'Record & Recalculate MAC'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};
