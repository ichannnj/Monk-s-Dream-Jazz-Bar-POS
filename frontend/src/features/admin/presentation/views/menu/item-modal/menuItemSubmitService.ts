import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, ProductAdmin, ProductVariantAdmin } from '../../../../data/admin.api';
import {
  uploadAndRecordProductImage,
  cleanupStorageObject,
  type PreparedMenuImage,
} from '@/features/menu/data/imageUpload.service';
import { ProductModifierStateItem, VariantMatrixRow } from './menuItemModal.types';

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
