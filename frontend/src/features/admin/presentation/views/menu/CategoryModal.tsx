import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal } from 'react-native';
import { X, FolderPlus } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type CategoryAdmin } from '../../../data/admin.api';

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: CategoryAdmin | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  category,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setSortOrder(category.sort_order.toString());
    } else {
      setName('');
      setSlug('');
      setSortOrder('0');
    }
  }, [category, visible]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!category) {
      // Auto-generate slug from name
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Category name is required', { title: 'Validation Error' });
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug identifier is required', { title: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (category) {
        await adminApi.updateCategory(category.id, {
          name: name.trim(),
          slug: slug.trim(),
          sort_order: parseInt(sortOrder, 10) || 0,
        });
        toast.success(`Updated "${name}"`, { title: 'Category Updated' });
      } else {
        await adminApi.createCategory({
          name: name.trim(),
          slug: slug.trim(),
          sort_order: parseInt(sortOrder, 10) || 0,
        });
        toast.success(`Created "${name}"`, { title: 'Category Created' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save category', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
                <FolderPlus size={22} color="#800020" />
              </View>
              <Text className="text-xl font-bold text-stone-900">
                {category ? 'Edit Menu Category' : 'Create Menu Category'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Form */}
          <View className="p-6 space-y-4">
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">Category Title</Text>
              <TextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder="e.g. Signature Cocktails, Artisan Espresso, Small Plates"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Slug (Internal Key)
              </Text>
              <TextInput
                value={slug}
                onChangeText={setSlug}
                placeholder="e.g. signature-cocktails, artisan-espresso"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Display Sort Order (Lower displays first)
              </Text>
              <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="numeric"
                placeholder="0"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
              />
            </View>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-end space-x-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
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
                {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Create Category'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
