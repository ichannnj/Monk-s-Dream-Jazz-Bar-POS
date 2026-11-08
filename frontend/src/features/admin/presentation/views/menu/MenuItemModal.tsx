import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Utensils, ShieldAlert, Leaf } from 'lucide-react-native';
import { PosMultiSelectDropdown } from '@/features/shared';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { MenuImageUploadField } from '../../components/MenuImageUploadField';
import {
  MenuItemModalProps,
  ALLERGEN_OPTIONS,
  DIETARY_OPTIONS,
} from './item-modal/menuItemModal.types';
import { useMenuItemModalController } from './item-modal/useMenuItemModalController';
import { MenuItemBasicInfoSection } from './item-modal/MenuItemBasicInfoSection';
import { MenuItemVariantMatrixSection } from './item-modal/MenuItemVariantMatrixSection';
import { MenuItemModifiersSection } from './item-modal/MenuItemModifiersSection';

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  visible,
  onClose,
  onSuccess,
  product,
  categories,
}) => {
  const ctrl = useMenuItemModalController({
    visible,
    product,
    categories,
    onClose,
    onSuccess,
  });

  const footer = (
    <>
      <Pressable
        onPress={onClose}
        disabled={ctrl.isSubmitting}
        className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-stone-200 active:bg-stone-300"
      >
        <Text className="text-base font-bold text-stone-700">Cancel</Text>
      </Pressable>
      <Pressable
        onPress={ctrl.handleSubmit}
        disabled={ctrl.isSubmitting}
        className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
      >
        <Text className="text-base font-bold text-white">
          {ctrl.isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress={false}
      title={product ? 'Edit Menu Product' : 'Add New Menu Product'}
      subtitle="Configure pricing, preparation routing station, dietary tags, and BOM links"
      icon={<Utensils size={22} color="#800020" />}
      size="lg"
      footer={footer}
    >
      <View className="space-y-5">
        <MenuItemBasicInfoSection
          name={ctrl.name}
          setName={ctrl.setName}
          categoryId={ctrl.categoryId}
          setCategoryId={ctrl.setCategoryId}
          categories={categories}
          stationTarget={ctrl.stationTarget}
          setStationTarget={ctrl.setStationTarget}
          isResoldOutsideFood={ctrl.isResoldOutsideFood}
          onToggleOutsideFood={ctrl.handleToggleOutsideFood}
          originalCost={ctrl.originalCost}
          onOriginalCostChange={ctrl.handleOriginalCostChange}
          basePrice={ctrl.basePrice}
          setBasePrice={ctrl.setBasePrice}
        />

        <MenuItemVariantMatrixSection
          hasVariants={ctrl.hasVariants}
          setHasVariants={ctrl.setHasVariants}
          supportedTemps={ctrl.supportedTemps}
          onToggleTemp={ctrl.handleToggleTemp}
          selectedSizes={ctrl.selectedSizes}
          onToggleSize={ctrl.handleToggleSize}
          customSizeInput={ctrl.customSizeInput}
          setCustomSizeInput={ctrl.setCustomSizeInput}
          onAddCustomSize={ctrl.handleAddCustomSize}
          variantsMatrix={ctrl.variantsMatrix}
          setVariantsMatrix={ctrl.setVariantsMatrix}
          onUpdateMatrixPrice={ctrl.handleUpdateMatrixPrice}
          onToggleMatrixRowAvailability={ctrl.handleToggleMatrixRowAvailability}
          onApplyBaseToAll={ctrl.handleApplyBaseToAll}
          onRegenerateMatrix={ctrl.regenerateMatrix}
        />

        <MenuItemModifiersSection
          catalogModifiers={ctrl.catalogModifiers}
          productModifiers={ctrl.productModifiers}
          modifierFilterCategory={ctrl.modifierFilterCategory}
          setModifierFilterCategory={ctrl.setModifierFilterCategory}
          onToggleModifierOption={ctrl.handleToggleModifierOption}
          onUpdateModifierPrice={ctrl.handleUpdateModifierPrice}
          onSelectAllCategoryModifiers={ctrl.handleSelectAllCategoryModifiers}
          onClearCategoryModifiers={ctrl.handleClearCategoryModifiers}
          customModName={ctrl.customModName}
          setCustomModName={ctrl.setCustomModName}
          customModPrice={ctrl.customModPrice}
          setCustomModPrice={ctrl.setCustomModPrice}
          onAddCustomModifier={ctrl.handleAddCustomModifier}
        />

        <MenuImageUploadField
          currentImageUrl={product?.image_url}
          currentStoragePath={product?.image_storage_path}
          stagedImage={ctrl.stagedImage}
          onStagedImageChange={ctrl.setStagedImage}
          urlValue={ctrl.imageUrl}
          onUrlValueChange={ctrl.setImageUrl}
          onClearPhoto={() => {
            ctrl.setImageUrl('');
            ctrl.setStagedImage(null);
          }}
          productName={ctrl.name}
          stationTarget={ctrl.stationTarget}
        />

        <AdminInput
          label="Description / Tasting Notes"
          value={ctrl.description}
          onChangeText={ctrl.setDescription}
          multiline
          numberOfLines={2}
          placeholder="Rich smoked bourbon with house bitters and orange oils..."
          className="min-h-[72px] py-2"
        />

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
              selectedValues={ctrl.selectedAllergens}
              onChange={ctrl.setSelectedAllergens}
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
                label: diet,
              }))}
              selectedValues={ctrl.selectedDietary}
              onChange={ctrl.setSelectedDietary}
              variant="success"
              icon={Leaf}
            />
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
export default MenuItemModal;
