import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, AlertTriangle, Wine, Utensils, FolderPlus } from 'lucide-react-native';
import { PosDropdown, type PosDropdownOption } from '@/features/shared';
import { AdminInput } from '../../../components/AdminInput';
import { AdminNumberInput } from '../../../components/AdminNumberInput';
import { CategoryAdmin } from '../../../../data/admin.api';

interface MenuItemBasicInfoSectionProps {
  name: string;
  setName: (val: string) => void;
  categoryId: string;
  setCategoryId: (val: string) => void;
  categories: CategoryAdmin[];
  stationTarget: 'bar' | 'kitchen';
  setStationTarget: (val: 'bar' | 'kitchen') => void;
  isResoldOutsideFood: boolean;
  onToggleOutsideFood: () => void;
  originalCost: string;
  onOriginalCostChange: (val: string) => void;
  basePrice: string;
  setBasePrice: (val: string) => void;
}

export const MenuItemBasicInfoSection: React.FC<MenuItemBasicInfoSectionProps> = ({
  name,
  setName,
  categoryId,
  setCategoryId,
  categories,
  stationTarget,
  setStationTarget,
  isResoldOutsideFood,
  onToggleOutsideFood,
  originalCost,
  onOriginalCostChange,
  basePrice,
  setBasePrice,
}) => {
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

  return (
    <>
      <AdminInput
        label="Product Name"
        required
        value={name}
        onChangeText={setName}
        placeholder="e.g. Monk's Signature Old Fashioned"
      />

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

      <Pressable
        onPress={onToggleOutsideFood}
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

      {isResoldOutsideFood ? (
        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminNumberInput
              label="Vendor Cost (₱)"
              mode="currency"
              value={originalCost}
              onChangeText={onOriginalCostChange}
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
    </>
  );
};
