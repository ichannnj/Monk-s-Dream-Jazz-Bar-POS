import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import {
  Users,
  UserPlus,
  Search,
  Edit3,
  KeyRound,
  Power,
  ExternalLink,
  Clock,
  Shield,
  Briefcase,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, PH_MINIMUM_WAGE_DAILY, type StaffMemberAdmin } from '../../data/admin.api';
import { AdminInput } from '../components';
import { CreateUserAccountModal } from './staff/CreateUserAccountModal';
import { CreateNonWorkflowStaffModal } from './staff/CreateNonWorkflowStaffModal';
import { EditStaffModal } from './staff/EditStaffModal';
import { ResetPinModal } from './staff/ResetPinModal';
import {
  PosDropdown,
  PosDropdownOption,
  realtimeGateway,
  useWindowVisibilitySync,
} from '@/features/shared';

interface AdminStaffViewProps {
  onRefresh?: () => void;
  onNavigateToAttendance?: () => void;
}

type DirectoryFilter = 'all' | 'pos_users' | 'non_users' | 'inactive';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin / Manager',
  cashier: 'Cashier',
  waiter: 'Waiter',
  station_bar: 'Bar Station',
  station_cafe: 'Cafe Station',
  station_food: 'Kitchen Station',
  printer_station: 'Printer Service',
};

export const AdminStaffView: React.FC<AdminStaffViewProps> = ({
  onRefresh,
  onNavigateToAttendance,
}) => {
  const [staffList, setStaffList] = useState<StaffMemberAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberAdmin | null>(null);
  const [resetPinStaff, setResetPinStaff] = useState<StaffMemberAdmin | null>(null);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getStaffRoster();
      setStaffList(data);
    } catch (e) {
      console.warn('Failed to load staff roster:', e);
      toast.error('Failed to load staff roster', { title: 'Network Notice' });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh when tab/screen is focused
  useWindowVisibilitySync(loadStaff);

  useEffect(() => {
    loadStaff();

    const interval = setInterval(() => {
      loadStaff();
    }, 10000);

    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onUserChange: () => loadStaff(),
      onAttendanceChange: () => loadStaff(),
      onPosSyncNeeded: () => loadStaff(),
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const handleToggleActiveStatus = async (member: StaffMemberAdmin) => {
    try {
      await adminApi.updateStaffMember(member.id, {
        is_active: !member.is_active,
      });
      realtimeGateway.broadcastPosSync('staff_status_toggled');
      toast.success(
        `${member.display_name} has been ${member.is_active ? 'deactivated' : 'reactivated'}.`,
        { title: 'Staff Status' }
      );
      loadStaff();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update active status', { title: 'Error' });
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (directoryFilter === 'pos_users' && !s.is_workflow_staff) return false;
      if (directoryFilter === 'non_users' && s.is_workflow_staff) return false;
      if (directoryFilter === 'inactive' && s.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.display_name?.toLowerCase().includes(q);
        const matchUsername = s.username?.toLowerCase().includes(q);
        const matchRole = s.role?.toLowerCase().includes(q);
        const matchJobTitle = s.job_title?.toLowerCase().includes(q);
        return matchName || matchUsername || matchRole || matchJobTitle;
      }
      return true;
    });
  }, [staffList, directoryFilter, searchQuery]);

  const counts = useMemo(() => {
    const activeAll = staffList.filter((s) => s.is_active).length;
    const posUsers = staffList.filter((s) => s.is_active && s.is_workflow_staff).length;
    const nonUsers = staffList.filter((s) => s.is_active && !s.is_workflow_staff).length;
    const inactive = staffList.filter((s) => !s.is_active).length;
    return { activeAll, posUsers, nonUsers, inactive };
  }, [staffList]);

  const directoryFilterOptions: PosDropdownOption<DirectoryFilter>[] = [
    { value: 'all', label: `All Staff (${counts.activeAll})`, icon: Users },
    { value: 'pos_users', label: `POS Users (${counts.posUsers})`, icon: Shield },
    { value: 'non_users', label: `Support Staff (${counts.nonUsers})`, icon: Briefcase },
    { value: 'inactive', label: `Inactive (${counts.inactive})`, icon: Users },
  ];

  const createStaffActions: PosDropdownOption<'create_user' | 'create_staff'>[] = [
    {
      value: 'create_user',
      label: 'New POS User Account',
      description: 'Cashiers, Waiters, Baristas, Chefs, Runners with station logins & PINs',
      icon: Shield,
    },
    {
      value: 'create_staff',
      label: 'New Support Personnel',
      description: 'Dishwashers, Security, Sound Techs, Cleaners with timeclock PINs',
      icon: Briefcase,
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View className="mb-5 flex-col md:flex-row md:items-center justify-between gap-3">
        <View className="flex-row items-center gap-2.5">
          <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Staff Roster
          </Text>
          <View className="rounded-full bg-white border border-stone-200 px-2.5 py-0.5">
            <Text className="text-xs font-bold text-stone-700">{counts.activeAll} Active</Text>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View className="flex-row flex-wrap items-center gap-2">
          {Platform.OS === 'web' && (
            <Pressable
              onPress={() => window.open('?mode=timeclock', '_blank')}
              className="h-10 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
              accessibilityLabel="Launch Timeclock Kiosk in new tab"
            >
              <ExternalLink size={15} color="#800020" />
              <Text className="ml-1.5 text-xs font-bold text-[#800020]">Timeclock ↗</Text>
            </Pressable>
          )}

          {onNavigateToAttendance && (
            <Pressable
              onPress={onNavigateToAttendance}
              className="h-10 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
              accessibilityLabel="Go to Attendance & Payroll Ledger"
            >
              <Clock size={15} color="#1c1917" />
              <Text className="ml-1.5 text-xs font-bold text-stone-800">Attendance →</Text>
            </Pressable>
          )}

          <PosDropdown
            mode="action"
            options={createStaffActions}
            onChange={(act) => {
              if (act === 'create_user') setShowCreateUserModal(true);
              else setShowCreateStaffModal(true);
            }}
            triggerLabel="+ Add Staff"
            triggerIcon={UserPlus}
            variant="wine"
            sheetTitle="Add Team Member"
            className="min-w-[130px]"
          />
        </View>
      </View>

      {/* Streamlined Search & Filter Row */}
      <View className="mb-4 flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-xs">
        <PosDropdown
          options={directoryFilterOptions}
          value={directoryFilter}
          onChange={setDirectoryFilter}
          prefixLabel="Filter:"
          sheetTitle="Filter Staff Directory"
          className="w-full sm:w-56"
        />

        <View className="flex-1">
          <AdminInput
            placeholder="Search by name, role, @username..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftElement={<Search size={18} color="#78716c" />}
          />
        </View>
      </View>

      {/* Decluttered Staff Directory List */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-5 shadow-xs">
        {filteredStaff.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Users size={36} color="#a8a29e" />
            <Text className="mt-3 text-lg font-bold text-stone-700">No staff found</Text>
            <Text className="mt-1 text-base text-stone-500 text-center">
              Try adjusting your filter or search terms.
            </Text>
          </View>
        ) : (
          <View className="space-y-2.5">
            {filteredStaff.map((member) => {
              const isPosUser = member.is_workflow_staff;
              const isAdmin = member.role === 'admin';
              const roleDisplay = isPosUser
                ? ROLE_LABELS[member.role] || member.role
                : member.job_title || 'Support Staff';

              // Generate 2-letter avatar initials
              const initials =
                (member.display_name || '')
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'MD';

              return (
                <View
                  key={member.id}
                  className={`flex-col md:flex-row md:items-center justify-between rounded-xl border p-3.5 sm:p-4 gap-3 ${
                    member.is_active
                      ? 'border-stone-200 bg-white'
                      : 'border-stone-200 bg-stone-50 opacity-60'
                  }`}
                >
                  {/* Left: Identity & Metadata */}
                  <View className="flex-row items-center space-x-3 flex-1 min-w-0">
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-xl border ${
                        isAdmin
                          ? 'bg-[#800020] border-[#800020]'
                          : isPosUser
                            ? 'bg-stone-900 border-stone-900'
                            : 'bg-stone-100 border-stone-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isAdmin || isPosUser ? 'text-white' : 'text-stone-700'
                        }`}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View className="ml-3 flex-1 min-w-0">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-base font-bold text-stone-900 truncate">
                          {member.display_name}
                        </Text>

                        {/* Clean Single Role Badge */}
                        <View
                          className={`rounded-full px-2 py-0.5 border ${
                            isAdmin
                              ? 'bg-stone-100 border-[#800020]/30'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isAdmin ? 'text-[#800020]' : 'text-stone-700'
                            }`}
                          >
                            {roleDisplay}
                          </Text>
                        </View>

                        {!member.is_active && (
                          <View className="rounded-full bg-stone-200 px-2 py-0.5">
                            <Text className="text-base font-bold text-stone-600">Inactive</Text>
                          </View>
                        )}
                      </View>

                      {/* Clean Subtitle: Username, Base Daily Rate, Phone */}
                      <Text className="text-base text-stone-500 mt-0.5 truncate">
                        @{member.username} ·{' '}
                        {isAdmin
                          ? 'Payroll Exempt'
                          : `₱${Number(member.base_daily_rate || PH_MINIMUM_WAGE_DAILY).toFixed(2)}/day`}
                        {member.phone ? ` · ${member.phone}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Right: Quick Actions */}
                  <View className="flex-row items-center justify-end gap-2 pt-2 md:pt-0 border-t border-stone-100 md:border-t-0">
                    <Pressable
                      onPress={() => setEditingStaff(member)}
                      className="h-9 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
                    >
                      <Edit3 size={14} color="#1c1917" />
                      <Text className="ml-1 text-xs font-semibold text-stone-800">Edit</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setResetPinStaff(member)}
                      className="h-9 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
                      accessibilityLabel={
                        isAdmin
                          ? `Reset Override PIN for ${member.display_name}`
                          : `Reset PIN for ${member.display_name}`
                      }
                    >
                      <KeyRound size={14} color="#800020" />
                      <Text className="ml-1 text-xs font-semibold text-[#800020]">PIN</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleToggleActiveStatus(member)}
                      className={`h-9 w-9 items-center justify-center rounded-xl border ${
                        member.is_active
                          ? 'border-stone-200 bg-white active:bg-stone-100'
                          : 'border-stone-300 bg-stone-100 active:bg-stone-200'
                      }`}
                      accessibilityLabel={member.is_active ? 'Deactivate staff' : 'Activate staff'}
                    >
                      <Power size={14} color={member.is_active ? '#78716c' : '#800020'} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Modals */}
      <CreateUserAccountModal
        visible={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={() => {
          loadStaff();
          onRefresh?.();
        }}
      />

      <CreateNonWorkflowStaffModal
        visible={showCreateStaffModal}
        onClose={() => setShowCreateStaffModal(false)}
        onSuccess={() => {
          loadStaff();
          onRefresh?.();
        }}
      />

      {editingStaff && (
        <EditStaffModal
          visible={!!editingStaff}
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSuccess={() => {
            loadStaff();
            onRefresh?.();
          }}
        />
      )}

      {resetPinStaff && (
        <ResetPinModal
          visible={!!resetPinStaff}
          staff={resetPinStaff}
          onClose={() => setResetPinStaff(null)}
          onSuccess={() => {
            loadStaff();
            onRefresh?.();
          }}
        />
      )}
    </ScrollView>
  );
};
