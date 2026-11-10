import { useState, useEffect, useRef } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';
import {
  adminApi,
  ProductAdmin,
  CategoryAdmin,
  ProductModifierOptionAdmin,
} from '../../../../data/admin.api';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { type PreparedMenuImage } from '@/features/menu/data/imageUpload.service';
import {
  ProductModifierStateItem,
  VariantMatrixRow,
  ProductFlavorOptionStateItem,
} from './menuItemModal.types';
import { initializeProductFormState } from './menuItemFormInitializer';
import { executeProductSubmit } from './menuItemSubmitService';

const DEFAULT_FLAVOR_GROUP_ID = '20000000-0000-0000-0000-000000000010';

const FALLBACK_FLAVOR_OPTIONS: ProductFlavorOptionStateItem[] = [
  {
    id: '30000000-0000-0000-0000-000000000041',
    groupId: DEFAULT_FLAVOR_GROUP_ID,
    code: 'classic',
    name: 'Classic',
    price_delta: '0',
    is_assigned: true,
    is_available: true,
    is_default: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000042',
    groupId: DEFAULT_FLAVOR_GROUP_ID,
    code: 'spanish',
    name: 'Spanish',
    price_delta: '25',
    is_assigned: true,
    is_available: true,
    is_default: false,
  },
  {
    id: '30000000-0000-0000-0000-000000000043',
    groupId: DEFAULT_FLAVOR_GROUP_ID,
    code: 'caramel',
    name: 'Caramel',
    price_delta: '30',
    is_assigned: true,
    is_available: true,
    is_default: false,
  },
  {
    id: '30000000-0000-0000-0000-000000000044',
    groupId: DEFAULT_FLAVOR_GROUP_ID,
    code: 'vanilla',
    name: 'Vanilla',
    price_delta: '25',
    is_assigned: true,
    is_available: true,
    is_default: false,
  },
];

export function useMenuItemModalController({
  visible,
  product,
  categories,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  product?: ProductAdmin | null;
  categories: CategoryAdmin[];
  onClose: () => void;
  onSuccess: () => void;
}) {
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

  const [hasVariants, setHasVariants] = useState(false);
  const [supportedTemps, setSupportedTemps] = useState<('HOT' | 'COLD')[]>(['HOT', 'COLD']);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['8oz', '12oz', '16oz']);
  const [variantsMatrix, setVariantsMatrix] = useState<VariantMatrixRow[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState('');

  // Flavor Group State
  const [hasFlavorGroup, setHasFlavorGroup] = useState(false);
  const [flavorOptions, setFlavorOptions] = useState<ProductFlavorOptionStateItem[]>([]);

  const [catalogModifiers, setCatalogModifiers] = useState<ProductModifierOptionAdmin[]>([]);
  const [productModifiers, setProductModifiers] = useState<ProductModifierStateItem[]>([]);
  const [modifierFilterCategory, setModifierFilterCategory] = useState<string>('all');
  const [customModName, setCustomModName] = useState('');
  const [customModPrice, setCustomModPrice] = useState('30.00');

  const prevVisibleRef = useRef(false);
  const activeProductIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    const isProductChanged = visible && product?.id !== activeProductIdRef.current;
    prevVisibleRef.current = visible;

    if (!visible) {
      activeProductIdRef.current = undefined;
      return;
    }

    if (!isOpening && !isProductChanged) return;
    activeProductIdRef.current = product?.id;

    adminApi.getCatalogModifiers().then((mods) => {
      setCatalogModifiers(mods);
    });

    // Load master Flavor options and product assignments
    async function loadFlavorData() {
      try {
        const isLatteProduct = product?.name?.trim().toLowerCase() === 'latte';

        const { data: grpData, error: grpError } = await (supabase.from as any)(
          'product_variant_groups'
        )
          .select('id, code, name')
          .eq('code', 'flavor')
          .maybeSingle();

        if (grpData && !grpError) {
          const { data: optData } = await (supabase.from as any)('product_variant_options')
            .select('id, code, name, default_price_delta, sort_order')
            .eq('group_id', grpData.id)
            .order('sort_order');

          let assignedGroup = false;
          const assignedOpts = new Map<string, { delta: number; isDefault: boolean }>();

          if (product?.id) {
            const { data: grpAssign } = await (supabase.from as any)(
              'product_variant_group_assignments'
            )
              .select('is_active')
              .match({ product_id: product.id, group_id: grpData.id })
              .maybeSingle();

            if (grpAssign?.is_active) {
              assignedGroup = true;
            }

            const { data: optAssigns } = await (supabase.from as any)(
              'product_variant_option_assignments'
            )
              .select('option_id, price_delta, is_default, is_available')
              .match({ product_id: product.id, is_available: true });

            (optAssigns || []).forEach((oa: any) => {
              assignedOpts.set(oa.option_id, {
                delta: Number(oa.price_delta),
                isDefault: Boolean(oa.is_default),
              });
            });
          }

          // If product is Latte and not yet configured, default enabled
          if (isLatteProduct && !assignedGroup && assignedOpts.size === 0) {
            assignedGroup = true;
          }

          setHasFlavorGroup(assignedGroup);
          const mappedOpts: ProductFlavorOptionStateItem[] = (
            optData && optData.length > 0 ? optData : FALLBACK_FLAVOR_OPTIONS
          ).map((o: any) => {
            const assigned = assignedOpts.get(o.id);
            const isAssigned = assigned ? true : isLatteProduct ? true : false;
            return {
              id: o.id,
              groupId: grpData.id,
              code: o.code,
              name: o.name,
              price_delta: assigned
                ? assigned.delta.toString()
                : (o.default_price_delta ?? o.price_delta ?? 0).toString(),
              is_assigned: isAssigned,
              is_available: true,
              is_default: assigned ? Boolean(assigned.isDefault) : o.code === 'classic',
            };
          });
          setFlavorOptions(mappedOpts);
        } else {
          // Fallback if product_variant_groups table is not yet deployed or unreachable
          const isLatte = isLatteProduct;
          setHasFlavorGroup(isLatte);
          setFlavorOptions(
            FALLBACK_FLAVOR_OPTIONS.map((o) => ({
              ...o,
              is_assigned: isLatte,
              is_default: o.code === 'classic',
            }))
          );
        }
      } catch (err) {
        console.warn('Error loading flavor group data, applying fallback:', err);
        const isLatte = product?.name?.trim().toLowerCase() === 'latte';
        setHasFlavorGroup(isLatte);
        setFlavorOptions(
          FALLBACK_FLAVOR_OPTIONS.map((o) => ({
            ...o,
            is_assigned: isLatte,
            is_default: o.code === 'classic',
          }))
        );
      }
    }
    loadFlavorData();

    const init = initializeProductFormState({ product, categories });
    setName(init.name);
    setCategoryId(init.categoryId);
    setBasePrice(init.basePrice);
    setStationTarget(init.stationTarget);
    setIsResoldOutsideFood(init.isResoldOutsideFood);
    setOriginalCost(init.originalCost);
    setImageUrl(init.imageUrl);
    setStagedImage(null);
    setDescription(init.description);
    setSelectedAllergens(init.selectedAllergens);
    setSelectedDietary(init.selectedDietary);
    setModifierFilterCategory(init.initialCatSlug);
    setProductModifiers(init.productModifiers);
    setHasVariants(init.hasVariants);
    setSupportedTemps(init.supportedTemps);
    setSelectedSizes(init.selectedSizes);
    setVariantsMatrix(init.variantsMatrix);
  }, [visible, product?.id]);

  const regenerateMatrix = (
    temps: ('HOT' | 'COLD')[],
    sizes: string[],
    currentMatrix = variantsMatrix
  ) => {
    const defaultP = basePrice.trim() || '180';
    const activeTemps: Array<'HOT' | 'COLD' | 'NONE'> = temps.length > 0 ? temps : ['NONE'];
    const activeSizes = sizes.length > 0 ? sizes : ['Standard'];

    const newRows: VariantMatrixRow[] = activeTemps.flatMap((temp) =>
      activeSizes.map((size) => {
        const existing = currentMatrix.find((r) => r.temperature === temp && r.size_label === size);
        return (
          existing || { temperature: temp, size_label: size, price: defaultP, is_available: true }
        );
      })
    );
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

  const handleToggleModifierOption = (mod: {
    id?: string;
    name: string;
    price_delta?: number;
    applicable_category?: string;
    inventory_item_id?: string | null;
    amount_delta?: number;
    unit?: string | null;
  }) => {
    setProductModifiers((prev) => {
      const exists = prev.some((m) => m.name.toLowerCase() === mod.name.toLowerCase());
      if (exists) {
        return prev.filter((m) => m.name.toLowerCase() !== mod.name.toLowerCase());
      } else {
        return [
          ...prev,
          {
            id: mod.id,
            name: mod.name,
            price_delta: (mod.price_delta || 0).toString(),
            applicable_category: mod.applicable_category || modifierFilterCategory,
            inventory_item_id: mod.inventory_item_id || null,
            amount_delta: mod.amount_delta || 0,
            unit: mod.unit || null,
          },
        ];
      }
    });
  };

  const handleUpdateModifierPrice = (modName: string, newPrice: string) => {
    setProductModifiers((prev) =>
      prev.map((m) => (m.name === modName ? { ...m, price_delta: newPrice } : m))
    );
  };

  const handleAddCustomModifier = () => {
    const trimmed = customModName.trim();
    if (!trimmed) {
      toast.error('Modifier name is required');
      return;
    }
    if (productModifiers.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning('This modifier is already added');
      return;
    }
    const p = parseFloat(customModPrice) || 0;
    setProductModifiers((prev) => [
      ...prev,
      {
        name: trimmed,
        price_delta: p.toFixed(2),
        applicable_category: modifierFilterCategory,
      },
    ]);
    setCustomModName('');
    toast.success(`Added modifier "${trimmed}"`);
  };

  const handleSelectAllCategoryModifiers = (catSlug: string) => {
    const matchingCatalog = catalogModifiers.filter(
      (m) =>
        catSlug === 'all' || m.applicable_category === catSlug || m.applicable_category === 'all'
    );
    setProductModifiers((prev) => {
      const copy = [...prev];
      for (const m of matchingCatalog) {
        if (!copy.some((existing) => existing.name.toLowerCase() === m.name.toLowerCase())) {
          copy.push({
            id: m.id,
            name: m.name,
            price_delta: (m.price_delta || 0).toString(),
            applicable_category: m.applicable_category || catSlug,
            inventory_item_id: m.inventory_item_id || null,
            amount_delta: m.amount_delta || 0,
            unit: m.unit || null,
          });
        }
      }
      return copy;
    });
    toast.info('Selected all modifiers for ' + catSlug);
  };

  const handleClearCategoryModifiers = (catSlug: string) => {
    if (catSlug === 'all') {
      setProductModifiers([]);
    } else {
      setProductModifiers((prev) =>
        prev.filter((m) => m.applicable_category !== catSlug && m.applicable_category !== 'all')
      );
    }
  };

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

  const handleToggleFlavorGroup = (enabled: boolean) => {
    setHasFlavorGroup(enabled);
    if (enabled) {
      if (flavorOptions.length === 0) {
        // If options list was empty, populate from master fallbacks
        setFlavorOptions(
          FALLBACK_FLAVOR_OPTIONS.map((o) => ({
            ...o,
            is_assigned: true,
            is_default: o.code === 'classic',
          }))
        );
      } else if (!flavorOptions.some((o) => o.is_assigned)) {
        // Auto-assign all options with default delta
        setFlavorOptions((prev) =>
          prev.map((o) => ({
            ...o,
            is_assigned: true,
            is_default: o.code === 'classic',
          }))
        );
      }
    }
  };

  const handleToggleOptionAssignment = (optId: string) => {
    setFlavorOptions((prev) =>
      prev.map((o) => (o.id === optId ? { ...o, is_assigned: !o.is_assigned } : o))
    );
  };

  const handleUpdateOptionPriceDelta = (optId: string, val: string) => {
    setFlavorOptions((prev) => prev.map((o) => (o.id === optId ? { ...o, price_delta: val } : o)));
  };

  const handleSetDefaultOption = (optId: string) => {
    setFlavorOptions((prev) => prev.map((o) => ({ ...o, is_default: o.id === optId })));
  };

  const handleSubmit = () => {
    return executeProductSubmit({
      product,
      name,
      categoryId,
      basePrice,
      stationTarget,
      isResoldOutsideFood,
      originalCost,
      imageUrl,
      stagedImage,
      description,
      selectedAllergens,
      selectedDietary,
      hasVariants,
      variantsMatrix,
      hasFlavorGroup,
      flavorOptions,
      productModifiers,
      currentUserId: currentUser?.id,
      onSuccess,
      onClose,
      setIsSubmitting,
    });
  };

  return {
    name,
    setName,
    categoryId,
    setCategoryId,
    basePrice,
    setBasePrice,
    stationTarget,
    setStationTarget,
    isResoldOutsideFood,
    originalCost,
    handleToggleOutsideFood,
    handleOriginalCostChange,
    imageUrl,
    setImageUrl,
    stagedImage,
    setStagedImage,
    description,
    setDescription,
    selectedAllergens,
    setSelectedAllergens,
    selectedDietary,
    setSelectedDietary,
    isSubmitting,
    hasVariants,
    setHasVariants,
    supportedTemps,
    selectedSizes,
    variantsMatrix,
    setVariantsMatrix,
    customSizeInput,
    setCustomSizeInput,
    handleToggleTemp,
    handleToggleSize,
    handleAddCustomSize,
    handleUpdateMatrixPrice,
    handleToggleMatrixRowAvailability,
    handleApplyBaseToAll,
    regenerateMatrix,
    hasFlavorGroup,
    setHasFlavorGroup,
    flavorOptions,
    setFlavorOptions,
    handleToggleFlavorGroup,
    handleToggleOptionAssignment,
    handleUpdateOptionPriceDelta,
    handleSetDefaultOption,
    catalogModifiers,
    productModifiers,
    modifierFilterCategory,
    setModifierFilterCategory,
    customModName,
    setCustomModName,
    customModPrice,
    setCustomModPrice,
    handleToggleModifierOption,
    handleUpdateModifierPrice,
    handleAddCustomModifier,
    handleSelectAllCategoryModifiers,
    handleClearCategoryModifiers,
    handleSubmit,
  };
}
