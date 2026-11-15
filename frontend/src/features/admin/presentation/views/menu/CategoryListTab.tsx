import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Edit, Trash2, FolderPlus } from 'lucide-react-native';
import type { CategoryAdmin, ProductAdmin } from '../../../data/admin.api';

interface CategoryListTabProps {
  categories: CategoryAdmin[];
  products: ProductAdmin[];
  onEditCategory: (cat: CategoryAdmin) => void;
  onDeleteCategory: (cat: CategoryAdmin) => void;
}

export const CategoryListTab: React.FC<CategoryListTabProps> = ({
  categories,
  products,
  onEditCategory,
  onDeleteCategory,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-5 lg:p-6 shadow-xs">
      {categories.length === 0 ? (
        <View className="py-12 items-center justify-center">
          <FolderPlus size={36} color="#a8a29e" />
          <Text className="mt-2 text-base text-stone-500">
            No categories defined yet. Tap "+ Add Category" above to create one.
          </Text>
        </View>
      ) : (
        <View className="divide-y divide-stone-100">
          {categories.map((cat) => {
            const productCount = products.filter((p) => p.category_id === cat.id).length;
            return (
              <View
                key={cat.id}
                className="flex-row items-center justify-between py-3 sm:py-3.5 first:pt-0 last:pb-0"
              >
                <Pressable
                  onPress={() => onEditCategory(cat)}
                  className="flex-1 pr-3 active:opacity-80"
                  accessibilityLabel={`Edit category ${cat.name}`}
                >
                  <Text className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                    {cat.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <Text className="text-xs text-stone-500 font-medium">/{cat.slug}</Text>
                    <Text className="text-stone-300 text-xs">•</Text>
                    <Text className="text-xs text-stone-500 font-medium">
                      {productCount} item{productCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>

                <View className="flex-row items-center gap-2 flex-shrink-0">
                  <Pressable
                    onPress={() => onEditCategory(cat)}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
                    accessibilityLabel={`Edit ${cat.name}`}
                  >
                    <Edit size={17} color="#1c1917" />
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteCategory(cat)}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
                    accessibilityLabel={`Delete ${cat.name}`}
                  >
                    <Trash2 size={17} color="#800020" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
