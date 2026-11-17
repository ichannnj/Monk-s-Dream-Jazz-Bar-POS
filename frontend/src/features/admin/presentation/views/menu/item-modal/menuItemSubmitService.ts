import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, ProductAdmin, ProductVariantAdmin } from '../../../../data/admin.api';
import { supabase } from '@/features/shared/infrastructure/supabase';
import {
  uploadAndRecordProductImage,
  cleanupStorageObject,
  type PreparedMenuImage,
} from '@/features/menu/data/imageUpload.service';
import {
  ProductModifierStateItem,
  VariantMatrixRow,
  ProductFlavorOptionStateItem,
} from './menuItemModal.types';

export interface SubmitProductParams {
  product?: ProductAdmin | null;
  name: string;
  categoryId: string;
  basePrice: string;
  stationTarget: 'bar' | 'kitchen';
  isResoldOutsideFood: boolean;
  originalCost: string;
  imageUrl: string;
  stagedImage: PreparedMenuImage | null;
  description: string;
  selectedAllergens: string[];
  selectedDietary: string[];
  hasVariants: boolean;
  variantsMatrix: VariantMatrixRow[];
  hasFlavorGroup?: boolean;
  flavorGroupName?: string;
  flavorGroupRequired?: boolean;
  flavorOptions?: ProductFlavorOptionStateItem[];
  productModifiers: ProductModifierStateItem[];
  currentUserId?: string;
  onSuccess: () => void;
  onClose: () => void;
  setIsSubmitting: (submitting: boolean) => void;
}

export async function executeProductSubmit({
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
  hasFlavorGroup = false,
  flavorGroupName = 'Flavor',
  flavorGroupRequired = false,
  flavorOptions = [],
  productModifiers,
  currentUserId,
  onSuccess,
  onClose,
  setIsSubmitting,
}: SubmitProductParams) {
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
      if (stagedImage) {
        const uploadRes = await uploadAndRecordProductImage(product.id, stagedImage, currentUserId);
        if (!uploadRes.success) {
          toast.error(uploadRes.error || 'Failed to upload photo to storage');
          setIsSubmitting(false);
          return;
        }
        finalImageUrl = uploadRes.publicUrl || null;
        finalStoragePath = uploadRes.storagePath || null;
      } else if (!finalImageUrl && product.image_storage_path) {
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

      const modifiersToSave = productModifiers.map((m) => ({
        name: m.name,
        price_delta: parseFloat(m.price_delta) || 0,
        applicable_category: m.applicable_category,
        inventory_item_id: m.inventory_item_id || null,
        amount_delta: m.amount_delta || 0,
        unit: m.unit || null,
      }));
      await adminApi.upsertProductModifiers(product.id, modifiersToSave);

      // Save Flavor Group & Options
      await saveFlavorAssignments(
        product.id,
        hasFlavorGroup,
        flavorGroupName,
        flavorGroupRequired,
        flavorOptions
      );

      toast.success(`Updated "${name}"`, { title: 'Menu Item Saved' });
    } else {
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

      if (stagedImage && newProduct?.id) {
        const uploadRes = await uploadAndRecordProductImage(
          newProduct.id,
          stagedImage,
          currentUserId
        );
        if (!uploadRes.success) {
          console.warn('[MenuItemModal] Image upload failed after creation:', uploadRes.error);
          toast.error('Product created, but photo upload failed: ' + uploadRes.error);
        }
      }

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

        const modifiersToSave = productModifiers.map((m) => ({
          name: m.name,
          price_delta: parseFloat(m.price_delta) || 0,
          applicable_category: m.applicable_category,
          inventory_item_id: m.inventory_item_id || null,
          amount_delta: m.amount_delta || 0,
          unit: m.unit || null,
        }));
        await adminApi.upsertProductModifiers(newProduct.id, modifiersToSave);

        // Save Flavor Group & Options
        await saveFlavorAssignments(
          newProduct.id,
          hasFlavorGroup,
          flavorGroupName,
          flavorGroupRequired,
          flavorOptions
        );
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
}

async function saveFlavorAssignments(
  productId: string,
  hasFlavorGroup: boolean,
  flavorGroupName: string = 'Flavor',
  flavorGroupRequired: boolean = false,
  flavorOptions: ProductFlavorOptionStateItem[] = []
) {
  try {
    if (!hasFlavorGroup) {
      // Deactivate group assignment and option assignments for this product
      const { error: deactGrpErr } = await (supabase.from as any)(
        'product_variant_group_assignments'
      )
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('product_id', productId);
      if (deactGrpErr) {
        console.info('Note: variant group assignments table not yet present:', deactGrpErr.message);
      }

      const { error: deactOptErr } = await (supabase.from as any)(
        'product_variant_option_assignments'
      )
        .update({ is_available: false, updated_at: new Date().toISOString() })
        .eq('product_id', productId);
      if (deactOptErr) {
        console.info('Note: option assignments update failed:', deactOptErr.message);
      }
      return;
    }

    // 1. Locate or create reusable variant group
    const cleanGroupCode =
      (flavorGroupName || 'flavor')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_') || 'flavor';
    let targetGroupId = flavorOptions.find((o) => o.groupId)?.groupId;

    const { data: existingGroup } = await (supabase.from as any)('product_variant_groups')
      .select('id, code, name')
      .or(
        `code.eq.${cleanGroupCode},id.eq.${targetGroupId || '00000000-0000-0000-0000-000000000000'}`
      )
      .maybeSingle();

    if (existingGroup) {
      targetGroupId = existingGroup.id;
      if (existingGroup.name !== flavorGroupName) {
        await (supabase.from as any)('product_variant_groups')
          .update({ name: flavorGroupName, updated_at: new Date().toISOString() })
          .eq('id', targetGroupId);
      }
    } else {
      const newGroupId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '20000000-0000-0000-0000-' +
            Math.floor(Math.random() * 1e12)
              .toString(16)
              .padStart(12, '0');

      const { data: createdGroup, error: crtErr } = await (supabase.from as any)(
        'product_variant_groups'
      )
        .insert({
          id: newGroupId,
          code: cleanGroupCode,
          name: flavorGroupName || 'Flavor',
          min_selections: flavorGroupRequired ? 1 : 0,
          max_selections: 1,
          is_required: flavorGroupRequired,
          allows_duplicates: false,
          is_active: true,
        })
        .select('id')
        .single();

      if (crtErr) {
        console.warn('Could not insert product_variant_groups:', crtErr.message);
      }
      if (createdGroup?.id) {
        targetGroupId = createdGroup.id;
      }
    }

    if (!targetGroupId) return;

    // 2. Upsert group assignment for this product
    const { error: grpErr } = await (supabase.from as any)(
      'product_variant_group_assignments'
    ).upsert({
      product_id: productId,
      group_id: targetGroupId,
      is_active: true,
      min_selections: flavorGroupRequired ? 1 : 0,
      max_selections: 1,
      is_required: flavorGroupRequired,
      sort_order: 1,
      updated_at: new Date().toISOString(),
    });
    if (grpErr) {
      console.info('Note: variant group assignments table not yet present:', grpErr.message);
      return;
    }

    // 3. Upsert or update options
    for (const opt of flavorOptions) {
      let optId = opt.id;
      const isCustomNew = opt.is_new || optId.startsWith('flavor-');

      if (isCustomNew) {
        const optionIdToInsert =
          typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
        const { data: insOpt, error: insErr } = await (supabase.from as any)(
          'product_variant_options'
        )
          .insert({
            ...(optionIdToInsert ? { id: optionIdToInsert } : {}),
            group_id: targetGroupId,
            code: opt.code,
            name: opt.name,
            default_price_delta: parseFloat(opt.price_delta) || 0,
            is_active: true,
          })
          .select('id')
          .single();

        if (insOpt?.id) {
          optId = insOpt.id;
        } else if (insErr) {
          console.warn('Could not insert new product_variant_option:', insErr.message);
        }
      } else {
        await (supabase.from as any)('product_variant_options')
          .update({
            name: opt.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', optId);
      }

      if (opt.is_assigned) {
        await (supabase.from as any)('product_variant_option_assignments').upsert({
          product_id: productId,
          option_id: optId,
          price_delta: parseFloat(opt.price_delta) || 0,
          is_default: Boolean(opt.is_default),
          is_available: true,
          updated_at: new Date().toISOString(),
        });
      } else {
        await (supabase.from as any)('product_variant_option_assignments')
          .update({ is_available: false, updated_at: new Date().toISOString() })
          .match({ product_id: productId, option_id: optId });
      }
    }
  } catch (err) {
    console.warn('[saveFlavorAssignments] Error updating flavor options:', err);
  }
}
