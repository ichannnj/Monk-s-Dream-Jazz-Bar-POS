import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { X, PackagePlus } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin, type SupplierAdmin } from '../../../data/admin.api';

interface InventoryItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: InventoryItemAdmin | null;
  suppliers: SupplierAdmin[];
}

const INVENTORY_CATEGORIES = [
  { key: 'COFFEE_TEA', label: 'Coffee & Tea' },
  { key: 'DAIRY_PLANT', label: 'Dairy & Plant Milks' },
  { key: 'SPIRITS_LIQUOR', label: 'Spirits & Liquors' },
  { key: 'WINE_BEER', label: 'Wine & Beers' },
  { key: 'SYRUPS_MIXERS', label: 'Syrups & Mixers' },
  { key: 'KITCHEN_MEAT', label: 'Kitchen Meats' },
  { key: 'PRODUCE', label: 'Fresh Produce' },
  { key: 'DRY_GOODS', label: 'Dry Goods & Pastas' },
  { key: 'PACKAGING', label: 'Packaging & Disposables' },
];

const STANDARD_UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'bottle', 'shot'];

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  visible,
  onClose,
  onSuccess,
  item,
  suppliers,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('COFFEE_TEA');
  const [currentStock, setCurrentStock] = useState('0');
  const [unit, setUnit] = useState('kg');
  const [minAlertLevel, setMinAlertLevel] = useState('5');
  const [unitCost, setUnitCost] = useState('0');
  const [supplierId, setSupplierId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setSku(item.sku);
      setName(item.name);
      setCategory(item.category);
      setCurrentStock(item.current_stock.toString());
      setUnit(item.unit);
      setMinAlertLevel(item.min_alert_level.toString());
      setUnitCost(item.unit_cost.toString());
      setSupplierId(item.supplier_id || (item.supplier?.id ?? ''));
    } else {
      setSku('');
      setName('');
      setCategory('COFFEE_TEA');
      setCurrentStock('0');
      setUnit('kg');
      setMinAlertLevel('5');
      setUnitCost('0');
      setSupplierId(suppliers[0]?.id || '');
    }
  }, [item, suppliers, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Item name is required', { title: 'Validation Error' });
      return;
    }
    if (!sku.trim()) {
      toast.error('SKU is required', { title: 'Validation Error' });
      return;
    }

    const stock = parseFloat(currentStock) || 0;
    const par = parseFloat(minAlertLevel) || 1;
    const cost = parseFloat(unitCost) || 0;

    setIsSubmitting(true);
    try {
      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      if (item) {
        await adminApi.updateInventoryItem(item.id, {
          sku: sku.trim(),
          name: name.trim(),
          category: category as any,
          unit: unit.trim(),
          min_alert_level: par,
          unit_cost: cost,
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || null,
        });
        toast.success(`Updated "${name}"`, { title: 'Item Saved' });
      } else {
        await adminApi.createInventoryItem({
          sku: sku.trim(),
          name: name.trim(),
          category: category as any,
          current_stock: stock,
          unit: unit.trim(),
          min_alert_level: par,
          unit_cost: cost,
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || null,
        });
        toast.success(`Created "${name}"`, { title: 'Inventory Item Added' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save inventory item', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-2xl max-h-[90%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
                <PackagePlus size={22} color="#800020" />
              </View>
              <Text className="text-xl font-bold text-stone-900">
                {item ? 'Edit Inventory Item' : 'New Inventory Item / Disposable'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView className="p-6 space-y-4" showsVerticalScrollIndicator={false}>
            {/* Name & SKU */}
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-stone-800 mb-1">Item Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Specialty Espresso Beans, 12oz Takeout Cup"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
                />
              </View>
              <View className="w-40">
                <Text className="text-base font-semibold text-stone-800 mb-1">SKU / Code</Text>
                <TextInput
                  value={sku}
                  onChangeText={setSku}
                  placeholder="e.g. COF-001"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
                />
              </View>
            </View>

            {/* Category Selector (Zero horizontal scroll) */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1.5">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {INVENTORY_CATEGORIES.map((c) => {
                  const isSel = category === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setCategory(c.key)}
                      className={`min-h-[48px] px-4 items-center justify-center rounded-xl border ${
                        isSel
                          ? 'bg-[#800020] border-[#800020]'
                          : 'bg-white border-stone-300 active:bg-stone-100'
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isSel ? 'text-white' : 'text-stone-700'
                        }`}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Measurement Unit */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1.5">
                Measurement Unit
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {STANDARD_UNITS.map((u) => {
                  const isSel = unit === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      className={`min-h-[48px] px-3.5 items-center justify-center rounded-xl border ${
                        isSel
                          ? 'bg-[#800020] border-[#800020]'
                          : 'bg-white border-stone-300 active:bg-stone-100'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${isSel ? 'text-white' : 'text-stone-700'}`}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Par Alert, Stock, & Unit Cost */}
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-stone-800 mb-1">
                  Min Par (Low Stock Alert)
                </Text>
                <TextInput
                  value={minAlertLevel}
                  onChangeText={setMinAlertLevel}
                  keyboardType="numeric"
                  placeholder="5"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
                />
              </View>

              <View className="flex-1">
                <Text className="text-base font-semibold text-stone-800 mb-1">
                  Unit Cost (₱ / {unit})
                </Text>
                <TextInput
                  value={unitCost}
                  onChangeText={setUnitCost}
                  keyboardType="numeric"
                  placeholder="0.00"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
                />
              </View>
            </View>

            {/* Initial Stock */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Current Stock On-Hand ({unit})
              </Text>
              <TextInput
                value={currentStock}
                onChangeText={setCurrentStock}
                keyboardType="numeric"
                editable={!item} // If editing, stock must be modified via Restock or Stocktake
                placeholder="0.00"
                className={`min-h-[48px] rounded-xl border border-stone-300 px-4 text-base ${
                  item ? 'bg-stone-100 text-stone-500' : 'bg-white text-stone-900 font-bold'
                }`}
              />
              {item && (
                <Text className="text-base text-stone-500 mt-1">
                  Use Restock or Stocktake tab to adjust on-hand stock
                </Text>
              )}
            </View>

            {/* Primary Supplier (Zero horizontal scroll) */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1.5">
                Primary Vendor / Supplier
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setSupplierId('')}
                  className={`min-h-[48px] px-4 items-center justify-center rounded-xl border ${
                    !supplierId
                      ? 'bg-stone-800 border-stone-800'
                      : 'bg-white border-stone-300 active:bg-stone-100'
                  }`}
                >
                  <Text
                    className={`text-base font-medium ${!supplierId ? 'text-white' : 'text-stone-700'}`}
                  >
                    No Assigned Supplier
                  </Text>
                </Pressable>
                {suppliers.map((s) => {
                  const isSel = supplierId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSupplierId(s.id)}
                      className={`min-h-[48px] px-4 items-center justify-center rounded-xl border ${
                        isSel
                          ? 'bg-[#800020] border-[#800020]'
                          : 'bg-white border-stone-300 active:bg-stone-100'
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isSel ? 'text-white' : 'text-stone-700'
                        }`}
                      >
                        {s.name} ({s.lead_time_days}d lead)
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center justify-end space-x-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-stone-200 active:bg-stone-300"
            >
              <Text className="text-base font-bold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
            >
              <Text className="text-base font-bold text-white">
                {isSubmitting ? 'Saving...' : item ? 'Save Changes' : 'Create Item'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
