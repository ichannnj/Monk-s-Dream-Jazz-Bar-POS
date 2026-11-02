import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, Utensils, AlertTriangle } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type ProductAdmin, type CategoryAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

interface MenuItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductAdmin | null;
  categories: CategoryAdmin[];
}

const ALLERGEN_OPTIONS = [
  'DAIRY',
  'GLUTEN',
  'PEANUTS',
  'TREE_NUTS',
  'SHELLFISH',
  'EGGS',
  'SOY',
  'FISH',
  'SESAME',
];

const DIETARY_OPTIONS = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'HALAL', 'KETO'];

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  visible,
  onClose,
  onSuccess,
  product,
  categories,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [stationTarget, setStationTarget] = useState<'bar' | 'kitchen'>('bar');
  const [isResoldOutsideFood, setIsResoldOutsideFood] = useState(false);
  const [originalCost, setOriginalCost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.category_id);
      setBasePrice(product.base_price.toString());
      setStationTarget((product.station_target as any) === 'kitchen' ? 'kitchen' : 'bar');
      setIsResoldOutsideFood(product.is_resold_outside_food);
      setOriginalCost(product.original_cost ? product.original_cost.toString() : '');
      setImageUrl(product.image_url || '');
      setDescription(product.description || '');
      setSelectedAllergens(product.allergens || []);
      setSelectedDietary(product.dietary || []);
    } else {
      setName('');
      setCategoryId(categories[0]?.id || '');
      setBasePrice('');
      setStationTarget('bar');
      setIsResoldOutsideFood(false);
      setOriginalCost('');
      setImageUrl('');
      setDescription('');
      setSelectedAllergens([]);
      setSelectedDietary([]);
    }
  }, [product, categories, visible]);

  const handleToggleOutsideFood = () => {
    const nextVal = !isResoldOutsideFood;
    setIsResoldOutsideFood(nextVal);
    if (nextVal) {
      const cost = parseFloat(originalCost) || 0;
      setBasePrice((cost * 1.2).toFixed(2));
    }
  };

  const handleOriginalCostChange = (val: string) => {
    setOriginalCost(val);
    const cost = parseFloat(val) || 0;
    setBasePrice((cost * 1.2).toFixed(2));
  };

  const toggleAllergen = (alg: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(alg) ? prev.filter((a) => a !== alg) : [...prev, alg]
    );
  };

  const toggleDietary = (diet: string) => {
    setSelectedDietary((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Product name is required', { title: 'Validation Error' });
      return;
    }
    if (!categoryId) {
      toast.error('Select a category for this product', { title: 'Validation Error' });
      return;
    }

    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
      toast.error('Valid base selling price is required', { title: 'Validation Error' });
      return;
    }

    if (isResoldOutsideFood) {
      const orig = parseFloat(originalCost);
      if (isNaN(orig) || orig <= 0) {
        toast.error('Original vendor cost is required for outside food (+20%)', {
          title: 'Validation Error',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (product) {
        await adminApi.updateProduct(product.id, {
          name: name.trim(),
          category_id: categoryId,
          base_price: price,
          station_target: stationTarget,
          is_resold_outside_food: isResoldOutsideFood,
          original_cost: isResoldOutsideFood ? parseFloat(originalCost) || null : null,
          image_url: imageUrl.trim() || null,
          description: description.trim(),
          allergens: selectedAllergens,
          dietary: selectedDietary,
        });
        toast.success(`Updated "${name}"`, { title: 'Menu Item Saved' });
      } else {
        await adminApi.createProduct({
          name: name.trim(),
          category_id: categoryId,
          base_price: price,
          station_target: stationTarget,
          is_resold_outside_food: isResoldOutsideFood,
          original_cost: isResoldOutsideFood ? parseFloat(originalCost) || null : null,
          image_url: imageUrl.trim() || null,
          description: description.trim(),
          allergens: selectedAllergens,
          dietary: selectedDietary,
        });
        toast.success(`Created "${name}"`, { title: 'Menu Item Created' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save menu product', { title: 'Error' });
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
          {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={product ? 'Edit Menu Product' : 'Add New Menu Product'}
      subtitle="Configure pricing, preparation routing station, dietary tags, and BOM links"
      icon={<Utensils size={22} color="#800020" />}
      size="lg"
      footer={footer}
    >
      <View className="space-y-5">
        {/* Name */}
        <AdminInput
          label="Product Name"
          required
          value={name}
          onChangeText={setName}
          placeholder="e.g. Monk's Signature Old Fashioned"
        />

        {/* Category */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => {
              const isSelected = categoryId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-[#800020] border-[#800020]'
                      : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-stone-700'}`}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Station Target */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">Target Station</Text>
          <View className="flex-row space-x-3">
            <Pressable
              onPress={() => setStationTarget('bar')}
              className={`min-h-[48px] flex-1 items-center justify-center rounded-xl border transition-all ${
                stationTarget === 'bar'
                  ? 'bg-[#800020] border-[#800020]'
                  : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
              }`}
            >
              <Text
                className={`text-base font-bold ${stationTarget === 'bar' ? 'text-white' : 'text-stone-700'}`}
              >
                🍸 Bar Station (Drinks/Espresso)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStationTarget('kitchen')}
              className={`min-h-[48px] flex-1 items-center justify-center rounded-xl border transition-all ${
                stationTarget === 'kitchen'
                  ? 'bg-[#800020] border-[#800020]'
                  : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
              }`}
            >
              <Text
                className={`text-base font-bold ${stationTarget === 'kitchen' ? 'text-white' : 'text-stone-700'}`}
              >
                🍳 Kitchen Station (Food/Pastas)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Outside Food +20% Pricing Rule Toggle */}
        <Pressable
          onPress={handleToggleOutsideFood}
          className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border transition-all ${
            isResoldOutsideFood
              ? 'bg-amber-50 border-amber-300'
              : 'bg-stone-50 border-stone-200 active:bg-stone-100'
          }`}
        >
          <View className="flex-row items-center space-x-3">
            <AlertTriangle size={22} color={isResoldOutsideFood ? '#b45309' : '#78716c'} />
            <View className="ml-2">
              <Text className="text-base font-bold text-stone-900">
                Resold Outside Food (+20% Fixed Markup)
              </Text>
              <Text className="text-base text-stone-500">
                Mandatory formula: Selling Price = Vendor Cost × 1.20
              </Text>
            </View>
          </View>
          <View
            className={`h-6 w-6 rounded-md items-center justify-center border ${
              isResoldOutsideFood ? 'bg-[#800020] border-[#800020]' : 'bg-white border-stone-400'
            }`}
          >
            {isResoldOutsideFood && <Check size={16} color="#ffffff" />}
          </View>
        </Pressable>

        {/* Pricing Input Fields */}
        {isResoldOutsideFood ? (
          <View className="flex-row space-x-3">
            <View className="flex-1">
              <AdminNumberInput
                label="Vendor Cost (₱)"
                mode="currency"
                value={originalCost}
                onChangeText={handleOriginalCostChange}
                placeholder="e.g. 100.00"
              />
            </View>
            <View className="flex-1">
              <AdminNumberInput
                label="Selling Price (+20% Locked)"
                mode="currency"
                value={basePrice}
                editable={false}
                className="bg-amber-50 text-amber-900 font-black border-amber-300"
              />
            </View>
          </View>
        ) : (
          <View>
            <AdminNumberInput
              label="Selling Base Price"
              required
              mode="currency"
              value={basePrice}
              onChangeText={setBasePrice}
              placeholder="e.g. 380.00"
            />
          </View>
        )}

        {/* Image URL & Description */}
        <AdminInput
          label="Image URL (Optional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://images.unsplash.com/..."
        />

        <AdminInput
          label="Description / Tasting Notes"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          placeholder="Rich smoked bourbon with house bitters and orange oils..."
          className="min-h-[72px] py-2"
        />

        {/* Allergens Flags */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">
            Allergen Warnings (Flags on POS Tablets & Chits)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map((alg) => {
              const active = selectedAllergens.includes(alg);
              return (
                <Pressable
                  key={alg}
                  onPress={() => toggleAllergen(alg)}
                  className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                    active
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-stone-50 border-stone-200 active:bg-stone-100 hover:bg-stone-100'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${active ? 'text-rose-800' : 'text-stone-600'}`}
                  >
                    {active ? `⚠️ ${alg}` : alg}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dietary Tags */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">Dietary Badges</Text>
          <View className="flex-row flex-wrap gap-2">
            {DIETARY_OPTIONS.map((diet) => {
              const active = selectedDietary.includes(diet);
              return (
                <Pressable
                  key={diet}
                  onPress={() => toggleDietary(diet)}
                  className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                    active
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-stone-50 border-stone-200 active:bg-stone-100 hover:bg-stone-100'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${active ? 'text-emerald-800' : 'text-stone-600'}`}
                  >
                    {active ? `🌿 ${diet}` : diet}
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
