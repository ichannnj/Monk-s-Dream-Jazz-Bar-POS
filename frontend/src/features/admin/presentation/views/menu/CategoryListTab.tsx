import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Edit, Trash2 } from 'lucide-react-native';
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
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      <View className="space-y-3">
        {categories.map((cat) => {
          const productCount = products.filter((p) => p.category_id === cat.id).length;
          return (
            <View
              key={cat.id}
              className="flex-row items-center justify-between border-b border-stone-100 py-3.5"
            >
              <View>
                <Text className="text-lg font-bold text-stone-900">{cat.name}</Text>
                <Text className="text-base text-stone-500">
                  Slug: {cat.slug} • Order: {cat.sort_order} • Products: {productCount}
                </Text>
              </View>
              <View className="flex-row items-center space-x-2">
                <Pressable
                  onPress={() => onEditCategory(cat)}
                  className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                >
                  <Edit size={18} color="#44403c" />
                </Pressable>
                <Pressable
                  onPress={() => onDeleteCategory(cat)}
                  className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 active:bg-rose-100"
                >
                  <Trash2 size={18} color="#e11d48" />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
