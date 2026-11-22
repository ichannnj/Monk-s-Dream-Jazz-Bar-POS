import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { PackagePlus } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, type PosDropdownOption } from '@/features/shared';
import { adminApi, type InventoryItemAdmin, type SupplierAdmin } from '../../../data/admin.api';
import {
  uploadInventoryReferenceImage,
  cleanupInventoryImageObject,
  type PreparedInventoryImage,
} from '../../../data/api/inventoryImage.service';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { InventoryPhotoField } from './components/InventoryPhotoField';
import { validateInventoryItemInput } from './utils/inventoryCalculations';

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
  const [targetStockLevel, setTargetStockLevel] = useState('');
  const [unitCost, setUnitCost] = useState('0');
  const [supplierId, setSupplierId] = useState<string>('');
  const [groceryNote, setGroceryNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stagedImage, setStagedImage] = useState<PreparedInventoryImage | null>(null);
  const [photoCleared, setPhotoCleared] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setErrorMsg(null);
    setStagedImage(null);
    setPhotoCleared(false);

    if (item) {
      setSku(item.sku);
      setName(item.name);
      setCategory(item.category);
      setCurrentStock(String(item.current_stock ?? 0));
      setUnit(item.unit);
      setMinAlertLevel(String(item.min_alert_level ?? 0));
      setTargetStockLevel(
        item.target_stock_level !== null && item.target_stock_level !== undefined
          ? String(item.target_stock_level)
          : ''
      );
      setUnitCost(String(item.unit_cost ?? 0));
      setSupplierId(item.supplier_id || (item.supplier?.id ?? ''));
      setGroceryNote(item.grocery_note || '');
      setImageUrl(item.reference_image_url || '');
    } else {
      setSku('');
      setName('');
      setCategory('COFFEE_TEA');
      setCurrentStock('0');
      setUnit('kg');
      setMinAlertLevel('5');
      setTargetStockLevel('');
      setUnitCost('0');
      setSupplierId(suppliers[0]?.id || '');
      setGroceryNote('');
      setImageUrl('');
    }
  }, [item, suppliers, visible]);

  const categoryOptions: PosDropdownOption<string>[] = INVENTORY_CATEGORIES.map((c) => ({
    value: c.key,
    label: c.label,
  }));

  const supplierOptions: PosDropdownOption<string>[] = [
    { value: '', label: 'No Assigned Supplier' },
    ...suppliers.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.lead_time_days}d lead)`,
    })),
  ];

  const handleClearPhoto = () => {
    setStagedImage(null);
    setImageUrl('');
    setPhotoCleared(true);
  };

  const handleSubmit = async () => {
    const validation = validateInventoryItemInput({
      name,
      sku,
      minAlertLevel,
      targetStockLevel,
      unitCost,
      currentStock,
      isEditing: Boolean(item),
    });

    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please check required fields.');
      return;
    }

    const stock = parseFloat(currentStock) || 0;
    const par = parseFloat(minAlertLevel) || 0;
    const target = targetStockLevel.trim() !== '' ? parseFloat(targetStockLevel) : null;
    const cost = parseFloat(unitCost) || 0;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      let finalImageUrl: string | null = photoCleared ? null : imageUrl.trim() || null;
      let finalStoragePath: string | null = photoCleared
        ? null
        : item?.reference_image_storage_path || null;

      if (item) {
        if (stagedImage) {
          const uploadRes = await uploadInventoryReferenceImage(item.id, stagedImage);
          if (!uploadRes.success) {
            setErrorMsg(uploadRes.error || 'Failed to upload reference photo.');
            setIsSubmitting(false);
            return;
          }
          if (item.reference_image_storage_path) {
            cleanupInventoryImageObject(item.reference_image_storage_path);
          }
          finalImageUrl = uploadRes.publicUrl || null;
          finalStoragePath = uploadRes.storagePath || null;
        } else if (photoCleared && item.reference_image_storage_path) {
          cleanupInventoryImageObject(item.reference_image_storage_path);
        }

        await adminApi.updateInventoryItem(item.id, {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          category: category as any,
          unit: unit.trim(),
          min_alert_level: par,
          target_stock_level: target,
          unit_cost: cost,
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || null,
          reference_image_url: finalImageUrl,
          reference_image_storage_path: finalStoragePath,
          grocery_note: groceryNote.trim() || null,
        });
        toast.success(`Updated "${name.trim()}"`, { title: 'Item Saved' });
      } else {
        const created = await adminApi.createInventoryItem({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          category: category as any,
          unit: unit.trim(),
          min_alert_level: par,
          target_stock_level: target,
          unit_cost: cost,
          current_stock: stock,
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || null,
          reference_image_url: finalImageUrl,
          reference_image_storage_path: null,
          grocery_note: groceryNote.trim() || null,
        });

        if (stagedImage && created?.id) {
          const uploadRes = await uploadInventoryReferenceImage(created.id, stagedImage);
          if (uploadRes.success && uploadRes.publicUrl) {
            await adminApi.updateInventoryItem(created.id, {
              reference_image_url: uploadRes.publicUrl,
              reference_image_storage_path: uploadRes.storagePath || null,
            });
          } else {
            toast.warning('Item created, but photo upload failed. You can retry via Edit.', {
              title: 'Photo Warning',
            });
          }
        }
        toast.success(`Created "${name.trim()}"`, { title: 'Item Added' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save inventory item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <View className="flex-row items-center justify-end gap-2.5 w-full">
      <Pressable
        onPress={onClose}
        disabled={isSubmitting}
        className="min-h-[48px] px-5 items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
      >
        <Text className="text-base font-bold text-[#1C1917]">Cancel</Text>
      </Pressable>
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="min-h-[48px] flex-1 sm:flex-initial px-6 items-center justify-center rounded-xl bg-[#810021] active:opacity-85"
      >
        <Text className="text-base font-bold text-white">
          {isSubmitting ? 'Saving...' : item ? 'Save Changes' : 'Create Item'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={item ? 'Edit Inventory Item' : 'New Inventory Item'}
      subtitle="SKU, thresholds, unit cost, and grocery reference"
      icon={<PackagePlus size={20} color="#810021" />}
      size="lg"
      footer={footer}
    >
      <View className="gap-5">
        {/* Identity */}
        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminInput
              label="Item Name"
              required
              value={name}
              onChangeText={(v) => {
                setErrorMsg(null);
                setName(v);
              }}
              placeholder="e.g. Oatside Barista Blend"
              clearable
            />
          </View>
          <View className="w-full sm:w-44">
            <AdminInput
              label="SKU / Code"
              required
              value={sku}
              onChangeText={(v) => {
                setErrorMsg(null);
                setSku(v);
              }}
              placeholder="DRY-001"
              autoCapitalize="characters"
              className="font-bold uppercase"
              clearable
            />
          </View>
        </View>

        {/* Category & Supplier */}
        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#1C1917] mb-1.5">Category</Text>
            <PosDropdown
              mode="select"
              options={categoryOptions}
              value={category}
              onChange={setCategory}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#1C1917] mb-1.5">Primary Supplier</Text>
            <PosDropdown
              mode="select"
              options={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
            />
          </View>
        </View>

        {/* Unit Selector */}
        <View>
          <Text className="text-base font-semibold text-[#1C1917] mb-2">Measurement Unit</Text>
          <View className="flex-row flex-wrap gap-2">
            {STANDARD_UNITS.map((u) => {
              const isSel = unit === u;
              return (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`min-h-[48px] min-w-[56px] px-4 items-center justify-center rounded-xl border ${
                    isSel ? 'bg-[#810021] border-[#810021]' : 'bg-white border-[#E7E5E4]'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${isSel ? 'text-white' : 'text-[#1C1917]'}`}
                  >
                    {u}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stock, Par & Target */}
        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminNumberInput
              label={`Min Par Alert (${unit})`}
              mode="decimal"
              value={minAlertLevel}
              onChangeText={setMinAlertLevel}
              placeholder="5"
              suffix={unit}
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label={`Target Reorder Level (${unit})`}
              mode="decimal"
              value={targetStockLevel}
              onChangeText={setTargetStockLevel}
              placeholder="Optional"
              suffix={unit}
            />
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminNumberInput
              label={`Unit Cost (₱ / ${unit})`}
              mode="currency"
              value={unitCost}
              onChangeText={setUnitCost}
              placeholder="0.00"
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label={`On-Hand Stock (${unit})`}
              mode="decimal"
              value={currentStock}
              onChangeText={setCurrentStock}
              editable={!item}
              placeholder="0.00"
              suffix={unit}
              className={item ? 'bg-[#FAF8F5] text-[#78716C]' : ''}
            />
          </View>
        </View>

        {/* Grocery Reference Photo & Note */}
        <View className="pt-2 border-t border-[#E7E5E4] gap-4">
          <InventoryPhotoField
            currentImageUrl={photoCleared ? null : item?.reference_image_url}
            stagedImage={stagedImage}
            onStagedImageChange={(img) => {
              setPhotoCleared(false);
              setStagedImage(img);
            }}
            urlValue={imageUrl}
            onUrlValueChange={(val) => {
              setPhotoCleared(false);
              setImageUrl(val);
            }}
            onClearPhoto={handleClearPhoto}
            itemName={name || sku}
          />

          <AdminInput
            label="Grocery / Brand Note"
            value={groceryNote}
            onChangeText={setGroceryNote}
            placeholder="e.g. Blue Barista Blend carton, 1L — S&R or Landmark"
            clearable
          />
        </View>

        {errorMsg && (
          <View className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
            <Text className="text-base font-semibold text-[#b32638]">{errorMsg}</Text>
          </View>
        )}
      </View>
    </AdminModal>
  );
};
