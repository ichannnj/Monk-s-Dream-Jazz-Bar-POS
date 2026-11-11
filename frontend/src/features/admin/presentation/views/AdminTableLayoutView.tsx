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
import {
  ConfirmationModal,
  PosDropdown,
  PosDropdownOption,
  realtimeGateway,
  useWindowVisibilitySync,
} from '@/features/shared';
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

  // Instant auto-fetch when window/tab is focused or tablet screen wakes up
  useWindowVisibilitySync(loadTables);

  useEffect(() => {
    loadTables();

    // 10-second silent background self-healing heartbeat
    const interval = setInterval(() => {
      loadTables();
    }, 10000);

    // Instant Realtime WebSocket CDC subscription
    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onTableChange: () => {
        loadTables();
      },
      onPosSyncNeeded: () => {
        loadTables();
      },
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
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
      dotColor: '#78716c',
    },
    {
      value: 'OCCUPIED',
      label: 'Occupied',
      badge: tables.filter((t) => t.is_occupied).length,
      dotColor: '#800020',
    },
  ];

  const renderTableCard = (t: TableAdmin) => (
    <View
      key={t.id}
      className="w-full sm:w-[48%] lg:w-[23.5%] rounded-2xl border border-stone-200 bg-white p-3.5 justify-between shadow-xs"
    >
      <View>
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-lg font-bold text-stone-900">{t.table_number}</Text>
          <View
            className={`px-2 py-0.5 rounded-full border ${
              t.is_occupied ? 'bg-stone-100 border-[#800020]/40' : 'bg-stone-50 border-stone-200'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                t.is_occupied ? 'text-[#800020]' : 'text-stone-600'
              }`}
            >
              {t.is_occupied ? 'Occupied' : 'Free'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Users size={14} color="#78716c" />
          <Text className="text-xs font-medium text-stone-500">{t.capacity} Seats</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-stone-100">
        {t.is_occupied && (
          <Pressable
            onPress={() => setTableToRelease(t)}
            className="h-9 w-9 items-center justify-center rounded-xl bg-stone-100 border border-stone-200 active:bg-stone-200"
            accessibilityLabel={`Release table ${t.table_number}`}
          >
            <Unlock size={14} color="#800020" />
          </Pressable>
        )}
        <Pressable
          onPress={() => handleOpenEdit(t)}
          className="h-9 w-9 items-center justify-center rounded-xl bg-white border border-stone-200 active:bg-stone-50"
          accessibilityLabel={`Edit table ${t.table_number}`}
        >
          <Edit size={14} color="#1c1917" />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(t)}
          className="h-9 w-9 items-center justify-center rounded-xl bg-stone-50 border border-stone-200 active:bg-stone-100"
          accessibilityLabel={`Delete table ${t.table_number}`}
        >
          <Trash2 size={14} color="#78716c" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Header & Dropdown Controls */}
      <View className="mb-5 flex-col md:flex-row md:items-center justify-between gap-3">
        <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          Table Layout
        </Text>

        <View className="flex-row flex-wrap items-center gap-2">
          <PosDropdown
            options={zoneOptions}
            value={zoneFilter}
            onChange={setZoneFilter}
            sheetTitle="Filter by Zone"
            className="flex-1 sm:flex-initial min-w-[150px]"
          />

          <PosDropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            sheetTitle="Filter by Occupancy"
            className="flex-1 sm:flex-initial min-w-[130px]"
          />

          <Pressable
            onPress={handleOpenAdd}
            className="h-10 flex-row items-center justify-center rounded-xl bg-[#800020] px-3.5 active:bg-[#600018] shadow-xs w-full sm:w-auto"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="ml-1.5 text-xs font-bold text-white">+ Add Table</Text>
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
                  Bar / Stage
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
