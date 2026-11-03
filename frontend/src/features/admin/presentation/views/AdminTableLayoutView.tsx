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
  Unlock,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { ConfirmationModal, PosDropdown, PosDropdownOption } from '@/features/shared';
import { adminApi, type TableAdmin } from '../../data/admin.api';
import { AdminModal, AdminInput, AdminNumberInput } from '../components';

type ZoneFilterType = 'ALL' | 'CAFE_AREA' | 'BAR_AREA';
type StatusFilterType = 'ALL' | 'AVAILABLE' | 'OCCUPIED';

export const AdminTableLayoutView: React.FC = () => {
  const [tables, setTables] = useState<TableAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableAdmin | null>(null);
  const [tableToRelease, setTableToRelease] = useState<TableAdmin | null>(null);
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

  const handleConfirmRelease = async () => {
    if (!tableToRelease) return;
    try {
      await adminApi.releaseTable(tableToRelease.id);
      toast.success(`Table "${tableToRelease.table_number}" released and marked Available.`, {
        title: 'Table Released',
      });
      setTableToRelease(null);
      loadTables();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to release table', { title: 'Release Error' });
    }
  };

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

  const filteredTables = tables.filter((t) => {
    if (zoneFilter !== 'ALL' && t.zone !== zoneFilter) return false;
    if (statusFilter === 'AVAILABLE' && t.is_occupied) return false;
    if (statusFilter === 'OCCUPIED' && !t.is_occupied) return false;
    return true;
  });

  const cafeTables = filteredTables.filter((t) => t.zone === 'CAFE_AREA');
  const barTables = filteredTables.filter((t) => t.zone === 'BAR_AREA');

  const zoneOptions: PosDropdownOption<ZoneFilterType>[] = [
    {
      value: 'ALL',
      label: 'All Floor Zones',
      badge: tables.length,
      icon: LayoutGrid,
    },
    {
      value: 'CAFE_AREA',
      label: 'Daytime Cafe Area',
      badge: tables.filter((t) => t.zone === 'CAFE_AREA').length,
      icon: Coffee,
    },
    {
      value: 'BAR_AREA',
      label: 'Bar & Stage Area',
      badge: tables.filter((t) => t.zone === 'BAR_AREA').length,
      icon: Wine,
    },
  ];

  const statusOptions: PosDropdownOption<StatusFilterType>[] = [
    { value: 'ALL', label: 'All Statuses', badge: tables.length },
    {
      value: 'AVAILABLE',
      label: 'Available',
      badge: tables.filter((t) => !t.is_occupied).length,
      dotColor: '#10b981',
    },
    {
      value: 'OCCUPIED',
      label: 'Occupied Tab',
      badge: tables.filter((t) => t.is_occupied).length,
      dotColor: '#f59e0b',
    },
  ];

  const renderTableCard = (t: TableAdmin) => (
    <View
      key={t.id}
      className="w-full sm:w-[48%] lg:w-[23.5%] rounded-2xl border border-stone-200 bg-stone-50/70 p-4 justify-between"
    >
      <View>
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xl font-extrabold text-stone-900">{t.table_number}</Text>
          <View
            className={`px-2.5 py-0.5 rounded-full flex-row items-center gap-1.5 ${
              t.is_occupied
                ? 'bg-amber-100 border border-amber-200'
                : 'bg-emerald-100 border border-emerald-200'
            }`}
          >
            <View
              className={`h-2 w-2 rounded-full ${
                t.is_occupied ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            />
            <Text
              className={`text-base font-bold ${
                t.is_occupied ? 'text-amber-900' : 'text-emerald-900'
              }`}
            >
              {t.is_occupied ? 'Occupied' : 'Free'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 text-stone-600">
          <Users size={16} color="#78716c" />
          <Text className="text-base font-medium text-stone-600">{t.capacity} Seats</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-end gap-2 mt-3 pt-3 border-t border-stone-200">
        {t.is_occupied && (
          <Pressable
            onPress={() => setTableToRelease(t)}
            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-amber-50 border border-amber-200 active:bg-amber-100"
            accessibilityLabel={`Release table ${t.table_number}`}
          >
            <Unlock size={18} color="#d97706" />
          </Pressable>
        )}
        <Pressable
          onPress={() => handleOpenEdit(t)}
          className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-300 active:bg-stone-100"
          accessibilityLabel={`Edit table ${t.table_number}`}
        >
          <Edit size={18} color="#44403c" />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(t)}
          className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
          accessibilityLabel={`Delete table ${t.table_number}`}
        >
          <Trash2 size={18} color="#e11d48" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Header & Dropdown Controls */}
      <View className="mb-5 flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
          Table Layout & Floor Plan
        </Text>

        <View className="flex-row flex-wrap items-center gap-2.5">
          <PosDropdown
            options={zoneOptions}
            value={zoneFilter}
            onChange={setZoneFilter}
            sheetTitle="Filter by Seating Zone"
            className="flex-1 sm:flex-initial min-w-[165px]"
          />

          <PosDropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            sheetTitle="Filter by Occupancy"
            className="flex-1 sm:flex-initial min-w-[150px]"
          />

          <Pressable
            onPress={handleOpenAdd}
            className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-5 active:opacity-90 shadow-sm w-full sm:w-auto"
          >
            <Plus size={20} color="#ffffff" />
            <Text className="ml-2 text-base font-bold text-white">+ Add Table</Text>
          </Pressable>
        </View>
      </View>

      {/* Grid of Tables by Zone */}
      <View className="space-y-5">
        {/* CAFE ZONE */}
        {(zoneFilter === 'ALL' || zoneFilter === 'CAFE_AREA') && (
          <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Coffee size={20} color="#800020" />
                <Text className="text-lg font-bold text-stone-900">
                  Daytime Cafe Area ({cafeTables.length})
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">{cafeTables.map(renderTableCard)}</View>
          </View>
        )}

        {/* BAR & LIVE STAGE ZONE */}
        {(zoneFilter === 'ALL' || zoneFilter === 'BAR_AREA') && (
          <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Wine size={20} color="#800020" />
                <Text className="text-lg font-bold text-stone-900">
                  Bar & Live Stage Area ({barTables.length})
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">{barTables.map(renderTableCard)}</View>
          </View>
        )}
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

      <ConfirmationModal
        visible={!!tableToRelease}
        title={`Release Table ${tableToRelease?.table_number || ''}?`}
        message="This will close any open tabs associated with this table and immediately reset its status to Available."
        confirmText="Force Release"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmRelease}
        onCancel={() => setTableToRelease(null)}
      />
    </ScrollView>
  );
};
