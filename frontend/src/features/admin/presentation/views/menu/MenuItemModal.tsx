import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Check,
  Utensils,
  AlertTriangle,
  Wine,
  Coffee,
  FolderPlus,
  Compass,
  ShieldAlert,
  Leaf,
  Flame,
  Snowflake,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';
import { PosDropdown, PosMultiSelectDropdown, type PosDropdownOption } from '@/features/shared';
import {
  adminApi,
  type ProductAdmin,
  type CategoryAdmin,
  type ProductVariantAdmin,
} from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { MenuImageUploadField } from '../../components/MenuImageUploadField';
import {
  uploadAndRecordProductImage,
  cleanupStorageObject,
  type PreparedMenuImage,
} from '@/features/menu/data/imageUpload.service';

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
  const { currentUser } = useAuthStore();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [stationTarget, setStationTarget] = useState<'bar' | 'kitchen'>('bar');
  const [isResoldOutsideFood, setIsResoldOutsideFood] = useState(false);
  const [originalCost, setOriginalCost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stagedImage, setStagedImage] = useState<PreparedMenuImage | null>(null);
  const [description, setDescription] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant & Matrix Pricing State
  const [hasVariants, setHasVariants] = useState(false);
  const [supportedTemps, setSupportedTemps] = useState<('HOT' | 'COLD')[]>(['HOT', 'COLD']);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['8oz', '12oz', '16oz']);
  const [variantsMatrix, setVariantsMatrix] = useState<
    Array<{
      id?: string;
      temperature: 'HOT' | 'COLD' | 'ROOM' | 'NONE';
      size_label: string;
      price: string;
      is_available: boolean;
    }>
  >([]);
  const [customSizeInput, setCustomSizeInput] = useState('');

  const PRESET_SIZES = ['8oz', '12oz', '16oz', 'Regular', 'Large', 'Single', 'Double'];

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.category_id);
      setBasePrice(product.base_price.toString());
      setStationTarget((product.station_target as any) === 'kitchen' ? 'kitchen' : 'bar');
      setIsResoldOutsideFood(product.is_resold_outside_food);
      setOriginalCost(product.original_cost ? product.original_cost.toString() : '');
      setImageUrl(product.image_url || '');
      setStagedImage(null);
      setDescription(product.description || '');
      setSelectedAllergens(product.allergens || []);
      setSelectedDietary(product.dietary || []);

      if (product.variants && product.variants.length > 0) {
        setHasVariants(true);
        const temps = Array.from(
          new Set(
            product.variants
              .map((v) => v.temperature)
              .filter((t): t is 'HOT' | 'COLD' => t === 'HOT' || t === 'COLD')
          )
        );
        const sizes = Array.from(new Set(product.variants.map((v) => v.size_label)));
        setSupportedTemps(temps.length > 0 ? temps : ['HOT', 'COLD']);
        setSelectedSizes(sizes.length > 0 ? sizes : ['8oz', '12oz', '16oz']);
        setVariantsMatrix(
          product.variants.map((v) => ({
            id: v.id,
            temperature: v.temperature,
            size_label: v.size_label,
            price: v.price.toString(),
            is_available: v.is_available !== false,
          }))
        );
      } else {
        setHasVariants(false);
        setSupportedTemps(['HOT', 'COLD']);
        setSelectedSizes(['8oz', '12oz', '16oz']);
        setVariantsMatrix([]);
      }
    } else {
      setName('');
      setCategoryId(categories[0]?.id || '');
      setBasePrice('');
      setStationTarget('bar');
      setIsResoldOutsideFood(false);
      setOriginalCost('');
      setImageUrl('');
      setStagedImage(null);
      setDescription('');
      setSelectedAllergens([]);
      setSelectedDietary([]);
      setHasVariants(false);
      setSupportedTemps(['HOT', 'COLD']);
      setSelectedSizes(['8oz', '12oz', '16oz']);
      setVariantsMatrix([]);
    }
  }, [product, categories, visible]);

  // Helper to re-generate combination matrix rows while preserving existing prices
  const regenerateMatrix = (
    temps: ('HOT' | 'COLD')[],
    sizes: string[],
    currentMatrix = variantsMatrix
  ) => {
    const defaultP = basePrice.trim() || '180';
    const newRows: typeof variantsMatrix = [];

    const activeTemps: Array<'HOT' | 'COLD' | 'NONE'> = temps.length > 0 ? temps : ['NONE'];
    const activeSizes = sizes.length > 0 ? sizes : ['Standard'];

    for (const temp of activeTemps) {
      for (const size of activeSizes) {
        const existing = currentMatrix.find((r) => r.temperature === temp && r.size_label === size);
        if (existing) {
          newRows.push(existing);
        } else {
          newRows.push({
            temperature: temp,
            size_label: size,
            price: defaultP,
            is_available: true,
          });
        }
      }
    }
    setVariantsMatrix(newRows);
  };

  const handleToggleTemp = (temp: 'HOT' | 'COLD') => {
    const updated = supportedTemps.includes(temp)
      ? supportedTemps.filter((t) => t !== temp)
      : [...supportedTemps, temp];
    setSupportedTemps(updated);
    regenerateMatrix(updated, selectedSizes);
  };

  const handleToggleSize = (size: string) => {
    const updated = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    setSelectedSizes(updated);
    regenerateMatrix(supportedTemps, updated);
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim();
    if (!trimmed || selectedSizes.includes(trimmed)) return;
    const updated = [...selectedSizes, trimmed];
    setSelectedSizes(updated);
    setCustomSizeInput('');
    regenerateMatrix(supportedTemps, updated);
  };

  const handleUpdateMatrixPrice = (index: number, val: string) => {
    setVariantsMatrix((prev) => prev.map((r, i) => (i === index ? { ...r, price: val } : r)));
  };

  const handleToggleMatrixRowAvailability = (index: number) => {
    setVariantsMatrix((prev) =>
      prev.map((r, i) => (i === index ? { ...r, is_available: !r.is_available } : r))
    );
  };

  const handleApplyBaseToAll = () => {
    const defaultP = basePrice.trim() || '180';
    setVariantsMatrix((prev) => prev.map((r) => ({ ...r, price: defaultP })));
    toast.info('Applied base price to all matrix combinations');
  };

  // Clean up staged blob URL when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (stagedImage?.previewUri && stagedImage.previewUri.startsWith('blob:')) {
        URL.revokeObjectURL(stagedImage.previewUri);
      }
    };
  }, [stagedImage]);

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
      let finalImageUrl: string | null = imageUrl.trim() || null;
      let finalStoragePath: string | null = product?.image_storage_path || null;

      if (product) {
        // If user staged a new local file, upload it now
        if (stagedImage) {
          const uploadRes = await uploadAndRecordProductImage(
            product.id,
            stagedImage,
            currentUser?.id
          );
          if (!uploadRes.success) {
            toast.error(uploadRes.error || 'Failed to upload photo to storage');
            setIsSubmitting(false);
            return;
          }
          finalImageUrl = uploadRes.publicUrl || null;
          finalStoragePath = uploadRes.storagePath || null;
        } else if (!finalImageUrl && product.image_storage_path) {
          // User cleared the photo
          cleanupStorageObject(product.image_storage_path);
          finalStoragePath = null;
        }

        await adminApi.updateProduct(product.id, {
          name: name.trim(),
          category_id: categoryId,
          base_price: price,
          station_target: stationTarget,
          is_resold_outside_food: isResoldOutsideFood,
          original_cost: isResoldOutsideFood ? parseFloat(originalCost) || null : null,
          image_url: finalImageUrl,
          image_storage_path: finalStoragePath,
          description: description.trim(),
          allergens: selectedAllergens,
          dietary: selectedDietary,
        });

        // Upsert variants
        if (hasVariants && variantsMatrix.length > 0) {
          const variantsToSave: ProductVariantAdmin[] = variantsMatrix
            .filter((v) => v.is_available)
            .map((v, idx) => ({
              temperature: v.temperature,
              size_label: v.size_label,
              price: parseFloat(v.price) || price,
              is_available: true,
              sort_order: idx + 1,
            }));
          await adminApi.upsertProductVariants(product.id, variantsToSave);
        } else {
          await adminApi.upsertProductVariants(product.id, []);
        }

        toast.success(`Updated "${name}"`, { title: 'Menu Item Saved' });
      } else {
        // 1. Create product row first to obtain authoritative UUID
        const newProduct = await adminApi.createProduct({
          name: name.trim(),
          category_id: categoryId,
          base_price: price,
          station_target: stationTarget,
          is_resold_outside_food: isResoldOutsideFood,
          original_cost: isResoldOutsideFood ? parseFloat(originalCost) || null : null,
          image_url: stagedImage ? null : finalImageUrl,
          description: description.trim(),
          allergens: selectedAllergens,
          dietary: selectedDietary,
        });

        // 2. If a local file was staged, upload to newly created product's folder
        if (stagedImage && newProduct?.id) {
          const uploadRes = await uploadAndRecordProductImage(
            newProduct.id,
            stagedImage,
            currentUser?.id
          );
          if (!uploadRes.success) {
            console.warn(
              '[MenuItemModal] Image upload failed after product creation:',
              uploadRes.error
            );
            toast.error('Product created, but photo upload failed: ' + uploadRes.error);
          }
        }

        // Upsert variants for new product
        if (newProduct?.id) {
          if (hasVariants && variantsMatrix.length > 0) {
            const variantsToSave: ProductVariantAdmin[] = variantsMatrix
              .filter((v) => v.is_available)
              .map((v, idx) => ({
                temperature: v.temperature,
                size_label: v.size_label,
                price: parseFloat(v.price) || price,
                is_available: true,
                sort_order: idx + 1,
              }));
            await adminApi.upsertProductVariants(newProduct.id, variantsToSave);
          }
        }

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

  const stationOptions: PosDropdownOption<'bar' | 'kitchen'>[] = [
    {
      value: 'bar',
      label: 'Bar Station (Cocktails, Wine & Espresso)',
      description: 'Chits and tickets route to Barista & Bartender KDS',
      icon: Wine,
    },
    {
      value: 'kitchen',
      label: 'Kitchen Station (Hot Food & Pastas)',
      description: 'Chits and tickets route to Kitchen Chef KDS',
      icon: Utensils,
    },
  ];

  const categoryOptions: PosDropdownOption<string>[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
    icon: FolderPlus,
  }));

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

        {/* Category & Target Station Dropdowns */}
        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-stone-800 mb-2">Category</Text>
            <PosDropdown
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              sheetTitle="Select Menu Category"
              className="w-full"
            />
          </View>

          <View className="flex-1">
            <Text className="text-base font-semibold text-stone-800 mb-2">Target Station</Text>
            <PosDropdown
              options={stationOptions}
              value={stationTarget}
              onChange={setStationTarget}
              sheetTitle="Select KDS Routing Station"
              className="w-full"
            />
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
          <View className="flex-col sm:flex-row gap-3">
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

        {/* Beverage Sizes & Temperature Matrix Toggle */}
        <View className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-4">
          <Pressable
            onPress={() => {
              const next = !hasVariants;
              setHasVariants(next);
              if (next && variantsMatrix.length === 0) {
                regenerateMatrix(supportedTemps, selectedSizes);
              }
            }}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 rounded-xl bg-amber-500/10 items-center justify-center border border-amber-500/20">
                <Coffee size={20} color="#b45309" />
              </View>
              <View className="ml-2">
                <Text className="text-base font-bold text-stone-900">
                  Beverage Sizes & Temperature Matrix
                </Text>
                <Text className="text-xs text-stone-500">
                  Separate prices for Hot / Iced and sizes (8oz, 12oz, etc.). If disabled, uses base
                  price.
                </Text>
              </View>
            </View>
            <View
              className={`h-6 w-6 rounded-md items-center justify-center border ${
                hasVariants ? 'bg-[#800020] border-[#800020]' : 'bg-white border-stone-400'
              }`}
            >
              {hasVariants && <Check size={16} color="#ffffff" />}
            </View>
          </Pressable>

          {/* Expanded Matrix Configuration */}
          {hasVariants && (
            <View className="border-t border-stone-200 pt-4 space-y-4">
              {/* Temperature Selection */}
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  1. Supported Temperatures
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleToggleTemp('HOT')}
                    className={`min-h-[44px] flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2 ${
                      supportedTemps.includes('HOT')
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <Flame
                      size={16}
                      color={supportedTemps.includes('HOT') ? '#ea580c' : '#78716c'}
                    />
                    <Text
                      className={`ml-2 text-sm font-bold ${
                        supportedTemps.includes('HOT') ? 'text-orange-700' : 'text-stone-600'
                      }`}
                    >
                      Hot Options
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleToggleTemp('COLD')}
                    className={`min-h-[44px] flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2 ${
                      supportedTemps.includes('COLD')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <Snowflake
                      size={16}
                      color={supportedTemps.includes('COLD') ? '#0284c7' : '#78716c'}
                    />
                    <Text
                      className={`ml-2 text-sm font-bold ${
                        supportedTemps.includes('COLD') ? 'text-sky-700' : 'text-stone-600'
                      }`}
                    >
                      Iced / Cold Options
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Sizes Selection */}
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  2. Offered Cup Sizes & Volumes
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-2.5">
                  {PRESET_SIZES.map((sz) => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <Pressable
                        key={sz}
                        onPress={() => handleToggleSize(sz)}
                        className={`min-h-[40px] px-3.5 py-1.5 rounded-lg border text-xs font-bold items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-emerald-700' : 'text-stone-600'
                          }`}
                        >
                          {sz}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Size Input */}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <AdminInput
                      value={customSizeInput}
                      onChangeText={setCustomSizeInput}
                      placeholder="Add custom size (e.g. 20oz, Pitcher)..."
                    />
                  </View>
                  <Pressable
                    onPress={handleAddCustomSize}
                    className="min-h-[44px] px-4 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-900"
                  >
                    <Text className="text-xs font-bold text-white">+ Add Size</Text>
                  </Pressable>
                </View>
              </View>

              {/* Price Matrix Table */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    3. Combination Price Matrix
                  </Text>
                  <Pressable
                    onPress={handleApplyBaseToAll}
                    className="px-2.5 py-1 rounded-md bg-stone-200 active:bg-stone-300"
                  >
                    <Text className="text-xs font-bold text-stone-700">
                      Apply Base Price to All
                    </Text>
                  </Pressable>
                </View>

                <View className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
                  {variantsMatrix.length === 0 ? (
                    <View className="p-4 items-center justify-center">
                      <Text className="text-xs text-stone-400">
                        Select at least one temperature and size above to build pricing matrix.
                      </Text>
                    </View>
                  ) : (
                    variantsMatrix.map((row, idx) => (
                      <View
                        key={`${row.temperature}-${row.size_label}-${idx}`}
                        className={`p-3 flex-row items-center justify-between gap-3 ${
                          !row.is_available ? 'opacity-40 bg-stone-50' : ''
                        }`}
                      >
                        {/* Temp & Size Badges */}
                        <View className="flex-row items-center space-x-2">
                          <View
                            className={`px-2 py-1 rounded-md border ${
                              row.temperature === 'HOT'
                                ? 'bg-orange-50 border-orange-200'
                                : row.temperature === 'COLD'
                                  ? 'bg-sky-50 border-sky-200'
                                  : 'bg-stone-100 border-stone-200'
                            }`}
                          >
                            <Text
                              className={`text-xs font-black ${
                                row.temperature === 'HOT'
                                  ? 'text-orange-700'
                                  : row.temperature === 'COLD'
                                    ? 'text-sky-700'
                                    : 'text-stone-700'
                              }`}
                            >
                              {row.temperature === 'HOT'
                                ? '🔥 HOT'
                                : row.temperature === 'COLD'
                                  ? '❄️ ICED'
                                  : 'STD'}
                            </Text>
                          </View>
                          <Text className="text-sm font-bold text-stone-800 ml-1">
                            {row.size_label}
                          </Text>
                        </View>

                        {/* Price Input & Availability */}
                        <View className="flex-row items-center space-x-2">
                          <View className="w-28">
                            <AdminNumberInput
                              mode="currency"
                              value={row.price}
                              onChangeText={(val) => handleUpdateMatrixPrice(idx, val)}
                              placeholder="0.00"
                            />
                          </View>
                          <Pressable
                            onPress={() => handleToggleMatrixRowAvailability(idx)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                              row.is_available
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-stone-100 border-stone-300 text-stone-400'
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                row.is_available ? 'text-emerald-700' : 'text-stone-400'
                              }`}
                            >
                              {row.is_available ? 'Offered' : 'Hidden'}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              setVariantsMatrix((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md"
                          >
                            <Trash2 size={16} color="#9ca3af" />
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Product Photo: File Upload & Live Preview */}
        <MenuImageUploadField
          currentImageUrl={product?.image_url}
          currentStoragePath={product?.image_storage_path}
          stagedImage={stagedImage}
          onStagedImageChange={setStagedImage}
          urlValue={imageUrl}
          onUrlValueChange={setImageUrl}
          onClearPhoto={() => {
            setImageUrl('');
            setStagedImage(null);
          }}
          productName={name}
          stationTarget={stationTarget}
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

        {/* Dropdowns for Allergens & Dietary (Clean, Compact Dropdown View) */}
        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <PosMultiSelectDropdown
              label="Allergen Warnings"
              placeholder="No allergens flagged"
              sheetTitle="Select Allergen Flags"
              options={ALLERGEN_OPTIONS.map((alg) => ({
                value: alg,
                label: `⚠️ ${alg}`,
              }))}
              selectedValues={selectedAllergens}
              onChange={setSelectedAllergens}
              variant="danger"
              icon={ShieldAlert}
            />
          </View>

          <View className="flex-1">
            <PosMultiSelectDropdown
              label="Dietary Badges"
              placeholder="No dietary badges"
              sheetTitle="Select Dietary Tags"
              options={DIETARY_OPTIONS.map((diet) => ({
                value: diet,
                label: `🌿 ${diet}`,
              }))}
              selectedValues={selectedDietary}
              onChange={setSelectedDietary}
              variant="success"
              icon={Leaf}
            />
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
