import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { PackagePlus } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin, type SupplierAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

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
          unit: unit.trim(),
          min_alert_level: par,
          unit_cost: cost,
          current_stock: stock,
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || null,
        });
        toast.success(`Created "${name}"`, { title: 'Item Added' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save inventory item', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <>
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
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={item ? 'Edit Inventory Item' : 'New Inventory Item / Disposable'}
      subtitle="Configure SKU, inventory category, stock alert thresholds, and unit costs"
      icon={<PackagePlus size={22} color="#800020" />}
      size="lg"
      footer={footer}
    >
      <View className="space-y-5">
        {/* Name & SKU */}
        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Item Name"
              required
              value={name}
              onChangeText={setName}
              placeholder="e.g. Specialty Espresso Beans, 12oz Takeout Cup"
            />
          </View>
          <View className="w-full sm:w-44">
            <AdminInput
              label="SKU / Code"
              required
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. COF-001"
              className="font-bold uppercase"
            />
          </View>
        </View>

        {/* Category Selector */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {INVENTORY_CATEGORIES.map((c) => {
              const isSel = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                    isSel
                      ? 'bg-[#800020] border-[#800020]'
                      : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${isSel ? 'text-white' : 'text-stone-700'}`}
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
          <Text className="text-base font-semibold text-stone-800 mb-2">Measurement Unit</Text>
          <View className="flex-row flex-wrap gap-2">
            {STANDARD_UNITS.map((u) => {
              const isSel = unit === u;
              return (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                    isSel
                      ? 'bg-[#800020] border-[#800020]'
                      : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
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
        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminNumberInput
              label="Min Par (Alert Level)"
              mode="decimal"
              value={minAlertLevel}
              onChangeText={setMinAlertLevel}
              placeholder="5"
              suffix={unit}
              helperText="Alerts station when below this"
            />
          </View>

          <View className="flex-1">
            <AdminNumberInput
              label={`Unit Cost (₱ / ${unit})`}
              mode="currency"
              value={unitCost}
              onChangeText={setUnitCost}
              placeholder="0.00"
              helperText="Moving average cost basis"
            />
          </View>
        </View>

        {/* Initial Stock */}
        <View>
          <AdminNumberInput
            label={`Current Stock On-Hand (${unit})`}
            mode="decimal"
            value={currentStock}
            onChangeText={setCurrentStock}
            editable={!item}
            placeholder="0.00"
            suffix={unit}
            helperText={
              item
                ? 'On-hand stock must be adjusted via Restock Intake or Stocktake Audit'
                : 'Initial counted stock at setup'
            }
            className={item ? 'bg-stone-100 text-stone-500' : ''}
          />
        </View>

        {/* Primary Supplier */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">
            Primary Vendor / Supplier
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setSupplierId('')}
              className={`min-h-[48px] px-4 items-center justify-center rounded-xl border ${
                !supplierId
                  ? 'bg-stone-800 border-stone-800'
                  : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
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
                      : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${isSel ? 'text-white' : 'text-stone-700'}`}
                  >
                    {s.name} ({s.lead_time_days}d lead)
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
