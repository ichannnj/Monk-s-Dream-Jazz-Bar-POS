import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FolderPlus } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type CategoryAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

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
          {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Create Category'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={category ? 'Edit Menu Category' : 'Create Menu Category'}
      subtitle="Groups products on Floor POS tables and customer receipts"
      icon={<FolderPlus size={22} color="#800020" />}
      size="md"
      footer={footer}
    >
      <View className="space-y-4">
        <AdminInput
          label="Category Title"
          required
          value={name}
          onChangeText={handleNameChange}
          placeholder="e.g. Signature Cocktails, Artisan Espresso, Small Plates"
        />

        <AdminInput
          label="Slug (Internal Key)"
          required
          value={slug}
          onChangeText={setSlug}
          placeholder="e.g. signature-cocktails, artisan-espresso"
          helperText="Used internally for station routing"
        />

        <AdminNumberInput
          label="Display Sort Order"
          mode="integer"
          value={sortOrder}
          onChangeText={setSortOrder}
          placeholder="0"
          helperText="Lower numbers appear first on POS buttons"
        />
      </View>
    </AdminModal>
  );
};
