import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, Sliders, Check } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  adminApi,
  type ModifierGroupAdmin,
  type InventoryItemAdmin,
} from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { ModifierOptionRow, type TempOption } from './ModifierOptionRow';

interface ModifierGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: ModifierGroupAdmin | null;
  inventoryItems: InventoryItemAdmin[];
}

export const ModifierGroupModal: React.FC<ModifierGroupModalProps> = ({
  visible,
  onClose,
  onSuccess,
  group,
  inventoryItems,
}) => {
  const [name, setName] = useState('');
  const [minSelections, setMinSelections] = useState('0');
  const [maxSelections, setMaxSelections] = useState('1');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<TempOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setMinSelections(group.min_selections.toString());
      setMaxSelections(group.max_selections.toString());
      setIsRequired(group.is_required);
      setOptions(
        (group.options || []).map((opt) => ({
          id: opt.id,
          name: opt.name,
          price_delta: opt.price_delta.toString(),
          inventory_item_id: opt.inventory_item_id || '',
          amount_delta: opt.amount_delta ? opt.amount_delta.toString() : '',
          unit: opt.unit || '',
        }))
      );
    } else {
      setName('');
      setMinSelections('0');
      setMaxSelections('1');
      setIsRequired(false);
      setOptions([
        {
          name: 'Standard / Regular',
          price_delta: '0',
          inventory_item_id: '',
          amount_delta: '',
          unit: '',
        },
      ]);
    }
  }, [group, visible]);

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      { name: '', price_delta: '0', inventory_item_id: '', amount_delta: '', unit: '' },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: keyof TempOption, value: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== index) return opt;
        const updated = { ...opt, [field]: value };
        if (field === 'inventory_item_id') {
          const matchedItem = inventoryItems.find((inv) => inv.id === value);
          updated.unit = matchedItem?.unit || '';
        }
        return updated;
      })
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Modifier group name is required', { title: 'Validation Error' });
      return;
    }

    const min = parseInt(minSelections, 10) || 0;
    const max = parseInt(maxSelections, 10) || 1;

    if (options.length === 0) {
      toast.error('Add at least one modifier option', { title: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    try {
      let groupId = group?.id;
      if (group) {
        await adminApi.updateModifierGroup(group.id, {
          name: name.trim(),
          min_selections: min,
          max_selections: max,
          is_required: isRequired,
        });
      } else {
        const created = await adminApi.createModifierGroup({
          name: name.trim(),
          min_selections: min,
          max_selections: max,
          is_required: isRequired,
        });
        groupId = created.id;
      }

      if (groupId) {
        for (const opt of options) {
          if (opt.name.trim()) {
            await adminApi.saveProductModifier({
              id: opt.id,
              group_id: groupId,
              name: opt.name.trim(),
              price_delta: parseFloat(opt.price_delta) || 0,
              inventory_item_id: opt.inventory_item_id || null,
              amount_delta: parseFloat(opt.amount_delta) || 0,
            });
          }
        }
      }

      toast.success(`Saved modifier group "${name}"`, { title: 'Modifier Saved' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save modifier group', { title: 'Error' });
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
          {isSubmitting ? 'Saving...' : 'Save Modifier Group'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={group ? 'Edit Modifier Group' : 'New Reusable Modifier Group'}
      subtitle="Configure drink/food variations, mandatory rules, and stock bindings"
      icon={<Sliders size={22} color="#800020" />}
      size="lg"
      footer={footer}
    >
      <View className="space-y-5">
        <AdminInput
          label="Modifier Group Title"
          required
          value={name}
          onChangeText={setName}
          placeholder="e.g. Milk Selection, Sweetness Level, Single Malt Upgrade"
        />

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminNumberInput
              label="Min Choices"
              mode="integer"
              value={minSelections}
              onChangeText={setMinSelections}
              placeholder="0"
              helperText="0 allows skipping"
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label="Max Choices"
              mode="integer"
              value={maxSelections}
              onChangeText={setMaxSelections}
              placeholder="1"
              helperText="Cap selections"
            />
          </View>
        </View>

        <Pressable
          onPress={() => setIsRequired(!isRequired)}
          className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border transition-all ${
            isRequired ? 'bg-[#800020]/10 border-[#800020]' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-stone-900">
              Required Choice (Staff must select before dispatch)
            </Text>
            <Text className="text-base text-stone-500">
              Forces waiter/cashier to select an option on the tablet
            </Text>
          </View>
          <View
            className={`h-6 w-6 rounded-md items-center justify-center border ${
              isRequired ? 'bg-[#800020] border-[#800020]' : 'bg-white border-stone-400'
            }`}
          >
            {isRequired && <Check size={16} color="#ffffff" />}
          </View>
        </Pressable>

        <View className="pt-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-stone-900">
              Modifier Options & Inventory Deltas
            </Text>
            <Pressable
              onPress={handleAddOption}
              className="min-h-[48px] flex-row items-center rounded-xl bg-stone-100 px-4 active:bg-stone-200"
            >
              <Plus size={18} color="#800020" />
              <Text className="ml-1.5 text-base font-bold text-[#800020]">Add Option</Text>
            </Pressable>
          </View>

          <View className="space-y-3">
            {options.map((opt, idx) => (
              <ModifierOptionRow
                key={idx}
                opt={opt}
                index={idx}
                inventoryItems={inventoryItems}
                onChange={handleOptionChange}
                onRemove={handleRemoveOption}
              />
            ))}
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
