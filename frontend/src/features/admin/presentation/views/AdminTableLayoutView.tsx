import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  LayoutGrid,
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Coffee,
  Wine,
  CheckCircle,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type TableAdmin } from '../../data/admin.api';
import { AdminModal, AdminInput, AdminNumberInput } from '../components';

export const AdminTableLayoutView: React.FC = () => {
  const [tables, setTables] = useState<TableAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableAdmin | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [zone, setZone] = useState<'CAFE_AREA' | 'BAR_AREA'>('CAFE_AREA');
  const [capacity, setCapacity] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getTables();
      setTables(data);
    } catch {
      toast.error('Failed to load table floor plan', { title: 'Load Error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableNumber(`T-${(tables.length + 1).toString().padStart(2, '0')}`);
    setZone('CAFE_AREA');
    setCapacity('4');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (table: TableAdmin) => {
    setEditingTable(table);
    setTableNumber(table.table_number);
    setZone(table.zone);
    setCapacity(table.capacity.toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (table: TableAdmin) => {
    if (table.is_occupied) {
      toast.error('Cannot delete an occupied table with an active tab', { title: 'Delete Error' });
      return;
    }
    try {
      await adminApi.deleteTable(table.id);
      toast.success(`Removed table "${table.table_number}"`, { title: 'Table Deleted' });
      loadTables();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete table', { title: 'Delete Error' });
    }
  };

  const handleSubmit = async () => {
    if (!tableNumber.trim()) {
      toast.error('Table number / identifier is required', { title: 'Validation Error' });
      return;
    }
    const capNum = parseInt(capacity, 10) || 2;

    setIsSubmitting(true);
    try {
      if (editingTable) {
        await adminApi.updateTable(editingTable.id, {
          table_number: tableNumber.trim(),
          zone,
          capacity: capNum,
        });
        toast.success(`Updated table "${tableNumber}"`, { title: 'Table Saved' });
      } else {
        await adminApi.createTable({
          table_number: tableNumber.trim(),
          zone,
          capacity: capNum,
        });
        toast.success(`Created table "${tableNumber}"`, { title: 'Table Added' });
      }
      setIsModalOpen(false);
      loadTables();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save table', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cafeTables = tables.filter((t) => t.zone === 'CAFE_AREA');
  const barTables = tables.filter((t) => t.zone === 'BAR_AREA');

  return (
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
            Table Layout & Floor Plan
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            Configure seating zones (Cafe vs Bar), capacities, and live jazz stage floor plan
          </Text>
        </View>

        <Pressable
          onPress={handleOpenAdd}
          className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-5 active:opacity-90 shadow-sm"
        >
          <Plus size={20} color="#ffffff" />
          <Text className="ml-2 text-base font-bold text-white">Add Physical Table</Text>
        </Pressable>
      </View>

      {/* Grid of Tables by Zone */}
      <View className="space-y-6">
        {/* CAFE ZONE */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <View className="flex-row items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <View className="flex-row items-center space-x-2">
              <Coffee size={22} color="#800020" />
              <Text className="text-xl font-bold text-stone-900">
                Daytime Cafe Area ({cafeTables.length} Tables)
              </Text>
            </View>
            <Text className="text-base text-stone-500">
              Assigned to Waiters & Cashier counter service
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            {cafeTables.map((t) => (
              <View
                key={t.id}
                className="w-48 rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between"
              >
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xl font-extrabold text-stone-900">{t.table_number}</Text>
                    <View
                      className={`h-3 w-3 rounded-full ${
                        t.is_occupied ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </View>
                  <View className="flex-row items-center space-x-1.5 text-stone-600">
                    <Users size={16} color="#78716c" />
                    <Text className="text-base text-stone-600">{t.capacity} Seats</Text>
                  </View>
                  <Text className="text-base text-stone-500 mt-1">
                    Status: {t.is_occupied ? 'Occupied Tab' : 'Available'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-end space-x-2 mt-4 pt-3 border-t border-stone-200">
                  <Pressable
                    onPress={() => handleOpenEdit(t)}
                    className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-300 active:bg-stone-100"
                  >
                    <Edit size={18} color="#44403c" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(t)}
                    className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
                  >
                    <Trash2 size={18} color="#e11d48" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* BAR & LIVE STAGE ZONE */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <View className="flex-row items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <View className="flex-row items-center space-x-2">
              <Wine size={22} color="#800020" />
              <Text className="text-xl font-bold text-stone-900">
                Bar & Live Stage Area ({barTables.length} Tables)
              </Text>
            </View>
            <Text className="text-base text-stone-500">
              Assigned to Bar counter & Concert seating
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            {barTables.map((t) => (
              <View
                key={t.id}
                className="w-48 rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between"
              >
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xl font-extrabold text-stone-900">{t.table_number}</Text>
                    <View
                      className={`h-3 w-3 rounded-full ${
                        t.is_occupied ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </View>
                  <View className="flex-row items-center space-x-1.5 text-stone-600">
                    <Users size={16} color="#78716c" />
                    <Text className="text-base text-stone-600">{t.capacity} Seats</Text>
                  </View>
                  <Text className="text-base text-stone-500 mt-1">
                    Status: {t.is_occupied ? 'Occupied Tab' : 'Available'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-end space-x-2 mt-4 pt-3 border-t border-stone-200">
                  <Pressable
                    onPress={() => handleOpenEdit(t)}
                    className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-300 active:bg-stone-100"
                  >
                    <Edit size={18} color="#44403c" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(t)}
                    className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
                  >
                    <Trash2 size={18} color="#e11d48" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ADD / EDIT MODAL */}
      {/* ADD / EDIT MODAL */}
      <AdminModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTable ? 'Edit Table' : 'Add Physical Table'}
        subtitle="Manage table numbers, room zones, and seating capacity"
        icon={<LayoutGrid size={22} color="#800020" />}
        size="md"
        footer={
          <>
            <Pressable
              onPress={() => setIsModalOpen(false)}
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
                {isSubmitting ? 'Saving...' : editingTable ? 'Save Changes' : 'Create Table'}
              </Text>
            </Pressable>
          </>
        }
      >
        <View className="space-y-4">
          <AdminInput
            label="Table Number / Identifier"
            required
            value={tableNumber}
            onChangeText={setTableNumber}
            placeholder="e.g. T-07, BAR-2, STAGE-1"
            className="font-bold uppercase"
          />

          <View>
            <Text className="text-base font-semibold text-stone-800 mb-2">Venue Zone</Text>
            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setZone('CAFE_AREA')}
                className={`min-h-[48px] flex-1 items-center justify-center rounded-xl border transition-all ${
                  zone === 'CAFE_AREA'
                    ? 'bg-[#800020] border-[#800020]'
                    : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    zone === 'CAFE_AREA' ? 'text-white' : 'text-stone-700'
                  }`}
                >
                  ☕ Cafe Area
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setZone('BAR_AREA')}
                className={`min-h-[48px] flex-1 items-center justify-center rounded-xl border transition-all ${
                  zone === 'BAR_AREA'
                    ? 'bg-[#800020] border-[#800020]'
                    : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    zone === 'BAR_AREA' ? 'text-white' : 'text-stone-700'
                  }`}
                >
                  🍸 Bar / Stage
                </Text>
              </Pressable>
            </View>
          </View>

          <AdminNumberInput
            label="Seating Capacity (Guests)"
            mode="integer"
            value={capacity}
            onChangeText={setCapacity}
            placeholder="4"
            suffix="seats"
          />
        </View>
      </AdminModal>
    </ScrollView>
  );
};
