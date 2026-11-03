import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Users,
  Award,
  Calendar,
  UserPlus,
  UserCheck,
  Search,
  Edit3,
  KeyRound,
  Power,
  Phone,
  Mail,
  Shield,
  Briefcase,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  adminApi,
  PH_MINIMUM_WAGE_DAILY,
  type AttendanceRecordAdmin,
  type StaffMemberAdmin,
} from '../../data/admin.api';
import { AdminModal, AdminNumberInput, AdminInput } from '../components';
import { CreateUserAccountModal } from './staff/CreateUserAccountModal';
import { CreateNonWorkflowStaffModal } from './staff/CreateNonWorkflowStaffModal';
import { EditStaffModal } from './staff/EditStaffModal';
import { ResetPinModal } from './staff/ResetPinModal';
import { PosDropdown, PosDropdownOption } from '@/features/shared';

interface AdminStaffViewProps {
  onRefresh?: () => void;
}

type StaffMainTab = 'directory' | 'payroll';
type DirectoryFilter = 'all' | 'pos_users' | 'non_users' | 'inactive';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin / Manager',
  cashier: 'Cashier',
  waiter: 'Waiter',
  station_bar: 'Bar Station',
  station_cafe: 'Cafe Station',
  station_food: 'Kitchen Station',
  foh_runner: 'FOH Runner',
  printer_station: 'Printer Service',
};

export const AdminStaffView: React.FC<AdminStaffViewProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<StaffMainTab>('directory');
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [staffRoster, setStaffRoster] = useState<StaffMemberAdmin[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecordAdmin[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordAdmin | null>(null);
  const [basePayInput, setBasePayInput] = useState('');
  const [addonPayInput, setAddonPayInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberAdmin | null>(null);
  const [resetPinStaff, setResetPinStaff] = useState<StaffMemberAdmin | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadStaffAndAttendance = async () => {
    setIsLoading(true);
    try {
      const staff = await adminApi.getStaffRoster();
      setStaffRoster(staff);

      try {
        const records = await adminApi.getAttendanceRecords(todayStr);
        if (records && records.length > 0) {
          // Merge any newly added staff who don't have an attendance record row yet today
          const recordedUserIds = new Set(records.map((r) => r.user_id));
          const missingStaffRecords: AttendanceRecordAdmin[] = staff
            .filter((s) => s.is_active && !recordedUserIds.has(s.id))
            .map((s) => ({
              id: `att-staff-${s.id}`,
              user_id: s.id,
              date: todayStr,
              is_present: s.is_active,
              base_daily_pay: parseFloat(String(s.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY,
              addon_pay: 0.0,
              total_day_pay: parseFloat(String(s.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY,
              user: {
                display_name: s.display_name,
                role: s.role,
                job_title: s.job_title,
                is_workflow_staff: s.is_workflow_staff,
              },
            }));
          setAttendance([...records, ...missingStaffRecords]);
        } else {
          const liveRecords: AttendanceRecordAdmin[] = staff.map((s) => ({
            id: `att-staff-${s.id}`,
            user_id: s.id,
            date: todayStr,
            is_present: s.is_active,
            base_daily_pay: parseFloat(String(s.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY,
            addon_pay: 0.0,
            total_day_pay: parseFloat(String(s.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY,
            user: {
              display_name: s.display_name,
              role: s.role,
              job_title: s.job_title,
              is_workflow_staff: s.is_workflow_staff,
            },
          }));
          setAttendance(liveRecords);
        }
      } catch {
        setAttendance(
          staff.map((s) => ({
            id: `att-${s.id}`,
            user_id: s.id,
            date: todayStr,
            is_present: s.is_active,
            base_daily_pay: parseFloat(String(s.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY,
            addon_pay: 0.0,
            total_day_pay: parseFloat(String(s.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY,
            user: {
              display_name: s.display_name,
              role: s.role,
              job_title: s.job_title,
              is_workflow_staff: s.is_workflow_staff,
            },
          }))
        );
      }
    } catch (e) {
      console.warn('Failed to load live staff roster:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffAndAttendance();
  }, []);

  const handleMutationSuccess = () => {
    loadStaffAndAttendance();
    onRefresh?.();
  };

  const handleToggleActiveStatus = async (member: StaffMemberAdmin) => {
    const nextStatus = !member.is_active;
    try {
      await adminApi.toggleStaffStatus(member.id, nextStatus);
      toast.success(`${member.display_name} is now ${nextStatus ? 'Active' : 'Inactive'}`, {
        title: nextStatus ? 'Staff Reactivated' : 'Staff Deactivated',
      });
      handleMutationSuccess();
    } catch {
      toast.error('Failed to update staff active status', { title: 'Status Error' });
    }
  };

  const handleUpdateAddon = async () => {
    if (!selectedRecord) return;
    const parsedBase = parseFloat(basePayInput);
    const parsedAddon = parseFloat(addonPayInput || '0');

    if (isNaN(parsedBase) || parsedBase < 0) {
      toast.error('Please enter a valid base daily rate', { title: 'Validation Error' });
      return;
    }
    if (isNaN(parsedAddon) || parsedAddon < 0) {
      toast.error('Please enter a valid discretionary bonus', { title: 'Validation Error' });
      return;
    }

    try {
      await adminApi.updateDiscretionaryAddon(selectedRecord.id, parsedAddon, parsedBase, {
        userId: selectedRecord.user_id,
        dateStr: todayStr,
        isPresent: selectedRecord.is_present,
      });
      toast.success(
        `Updated pay (Base: ₱${parsedBase.toFixed(2)}, Bonus: +₱${parsedAddon.toFixed(2)}) for ${selectedRecord.user?.display_name}`,
        { title: 'Pay & Bonus Updated' }
      );
      setSelectedRecord(null);
      setBasePayInput('');
      setAddonPayInput('');
      loadStaffAndAttendance();
    } catch {
      toast.error('Failed to update staff pay and shift add-on', { title: 'Update Error' });
    }
  };

  // Counts & Filtered Directory
  const counts = useMemo(() => {
    const activeAll = staffRoster.filter((s) => s.is_active).length;
    const posUsers = staffRoster.filter((s) => s.is_active && s.is_workflow_staff).length;
    const nonUsers = staffRoster.filter((s) => s.is_active && !s.is_workflow_staff).length;
    const inactive = staffRoster.filter((s) => !s.is_active).length;
    return { activeAll, posUsers, nonUsers, inactive };
  }, [staffRoster]);

  const filteredStaff = useMemo(() => {
    return staffRoster.filter((member) => {
      if (directoryFilter === 'all' && !member.is_active) return false;
      if (directoryFilter === 'pos_users' && (!member.is_active || !member.is_workflow_staff))
        return false;
      if (directoryFilter === 'non_users' && (!member.is_active || member.is_workflow_staff))
        return false;
      if (directoryFilter === 'inactive' && member.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = member.display_name?.toLowerCase().includes(q);
        const matchUser = member.username?.toLowerCase().includes(q);
        const matchRole = member.role?.toLowerCase().includes(q);
        const matchTitle = member.job_title?.toLowerCase().includes(q);
        return matchName || matchUser || matchRole || matchTitle;
      }

      return true;
    });
  }, [staffRoster, directoryFilter, searchQuery]);

  const getInitials = (name: string) => {
    return (
      name
        .replace(/\(.*?\)/g, '')
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'ST'
    );
  };

  const staffTabOptions: PosDropdownOption<StaffMainTab>[] = [
    {
      value: 'directory',
      label: 'Staff Directory',
      badge: counts.activeAll,
      icon: Users,
      description: 'Manage POS user accounts, non-user staff, and PIN security',
    },
    {
      value: 'payroll',
      label: 'Daily Payroll & Bonuses',
      icon: Award,
      description: 'Attendance tracking, base daily shift rates, and add-on bonuses',
    },
  ];

  const directoryFilterOptions: PosDropdownOption<DirectoryFilter>[] = [
    { value: 'all', label: 'All Active Staff', badge: counts.activeAll, icon: Users },
    { value: 'pos_users', label: 'POS User Accounts', badge: counts.posUsers, icon: Shield },
    { value: 'non_users', label: 'Non-User Venue Staff', badge: counts.nonUsers, icon: Briefcase },
    { value: 'inactive', label: 'Inactive / Archived', badge: counts.inactive, icon: Power },
  ];

  const createStaffActions: PosDropdownOption<'create_user' | 'create_staff'>[] = [
    {
      value: 'create_user',
      label: '+ New POS User Account',
      description: 'Waiter, Cashier, Bartender, Barista, Chef, Runner, or Manager with 4-digit PIN',
      icon: UserCheck,
    },
    {
      value: 'create_staff',
      label: '+ Add Non-User Venue Staff',
      description: 'Support staff (Dishwasher, Security, Cleaner, Musician, Sound Tech)',
      icon: UserPlus,
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header & Unified Dropdown Controls */}
      <View className="mb-5 flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
          Staff Roster &amp; Payroll
        </Text>

        <View className="flex-row flex-wrap items-center gap-2.5">
          <PosDropdown
            options={staffTabOptions}
            value={activeTab}
            onChange={setActiveTab}
            prefixLabel="View:"
            sheetTitle="Select Staff Section"
            className="flex-1 sm:flex-initial min-w-[190px]"
          />

          <PosDropdown
            mode="action"
            options={createStaffActions}
            onChange={(act) => {
              if (act === 'create_user') setShowCreateUserModal(true);
              else setShowCreateStaffModal(true);
            }}
            triggerLabel="+ Add Staff / User"
            triggerIcon={UserPlus}
            variant="wine"
            sheetTitle="Add Team Member"
            className="flex-1 sm:flex-initial min-w-[175px]"
          />

          <View className="min-h-[48px] hidden sm:flex flex-row items-center rounded-xl border border-stone-200 bg-white px-3.5 py-2.5">
            <Calendar size={16} color="#78716c" />
            <Text className="ml-2 text-base font-bold text-stone-700">{todayStr}</Text>
          </View>
        </View>
      </View>

      {activeTab === 'directory' ? (
        <View className="space-y-4">
          {/* Filter Dropdown & Search Bar */}
          <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-xs">
            <PosDropdown
              options={directoryFilterOptions}
              value={directoryFilter}
              onChange={setDirectoryFilter}
              prefixLabel="Show:"
              sheetTitle="Filter Staff Directory"
              className="w-full sm:w-64"
            />

            <View className="flex-1">
              <AdminInput
                placeholder="Search name, role, job title..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftElement={<Search size={18} color="#78716c" />}
              />
            </View>
          </View>

          {/* Staff Directory List */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs">
            {filteredStaff.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Users size={36} color="#a8a29e" />
                <Text className="mt-3 text-lg font-bold text-stone-700">
                  No staff members found
                </Text>
                <Text className="mt-1 text-sm text-stone-500">
                  Use the buttons above to create a POS User Account or add a Venue Staff member.
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {filteredStaff.map((member) => {
                  const isPosUser = member.is_workflow_staff;
                  const roleLabel = isPosUser
                    ? ROLE_LABELS[member.role] || member.role
                    : member.job_title || 'Venue Staff';

                  return (
                    <View
                      key={member.id}
                      className={`flex-col lg:flex-row lg:items-center justify-between rounded-2xl border p-4 gap-4 ${
                        member.is_active
                          ? 'border-stone-200/80 bg-white'
                          : 'border-stone-200 bg-stone-50/70 opacity-75'
                      }`}
                    >
                      {/* Left: Identity & Badges */}
                      <View className="flex-row items-start sm:items-center gap-3.5 flex-1">
                        <View
                          className={`h-12 w-12 items-center justify-center rounded-full border ${
                            isPosUser
                              ? 'border-[#800020]/20 bg-[#800020]/10'
                              : 'border-purple-200 bg-purple-50'
                          }`}
                        >
                          <Text
                            className={`text-base font-black ${
                              isPosUser ? 'text-[#800020]' : 'text-purple-800'
                            }`}
                          >
                            {getInitials(member.display_name)}
                          </Text>
                        </View>

                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="text-lg font-bold text-stone-900">
                              {member.display_name}
                            </Text>

                            {/* Type Badge: POS User vs Venue Personnel */}
                            <View
                              className={`flex-row items-center rounded-full px-2.5 py-0.5 ${
                                isPosUser
                                  ? 'bg-emerald-50 border border-emerald-200'
                                  : 'bg-purple-50 border border-purple-200'
                              }`}
                            >
                              <View
                                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                  isPosUser ? 'bg-emerald-600' : 'bg-purple-600'
                                }`}
                              />
                              <Text
                                className={`text-xs font-bold ${
                                  isPosUser ? 'text-emerald-800' : 'text-purple-800'
                                }`}
                              >
                                {isPosUser ? 'POS App User' : 'Non-User Staff'}
                              </Text>
                            </View>

                            {!member.is_active && (
                              <View className="rounded-full bg-stone-200 px-2.5 py-0.5">
                                <Text className="text-xs font-bold text-stone-700">Inactive</Text>
                              </View>
                            )}
                          </View>

                          {/* Sub-details: Role, Job Title, Username */}
                          <View className="mt-1 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                            <View className="flex-row items-center">
                              {isPosUser ? (
                                <Shield size={13} color="#78716c" />
                              ) : (
                                <Briefcase size={13} color="#78716c" />
                              )}
                              <Text className="ml-1 text-sm font-semibold text-stone-700">
                                {roleLabel}
                              </Text>
                            </View>

                            {isPosUser && member.job_title ? (
                              <Text className="text-sm text-stone-500">• {member.job_title}</Text>
                            ) : null}

                            <Text className="text-sm text-stone-400">ID: @{member.username}</Text>

                            {member.phone ? (
                              <View className="flex-row items-center">
                                <Phone size={12} color="#78716c" />
                                <Text className="ml-1 text-xs text-stone-500">{member.phone}</Text>
                              </View>
                            ) : null}

                            {member.email ? (
                              <View className="flex-row items-center">
                                <Mail size={12} color="#78716c" />
                                <Text className="ml-1 text-xs text-stone-500">{member.email}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {/* Right: Rate & Actions */}
                      <View className="flex-row flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t border-stone-100 lg:border-t-0">
                        <View className="mr-2">
                          <Text className="text-xs text-stone-400">Base Shift Rate</Text>
                          <Text className="text-base font-black text-stone-900">
                            ₱{Number(member.base_daily_rate || PH_MINIMUM_WAGE_DAILY).toFixed(2)}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          <Pressable
                            onPress={() => setEditingStaff(member)}
                            className="min-h-[42px] flex-row items-center rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 active:bg-stone-100"
                          >
                            <Edit3 size={15} color="#44403c" />
                            <Text className="ml-1.5 text-sm font-bold text-stone-700">Edit</Text>
                          </Pressable>

                          {isPosUser && (
                            <Pressable
                              onPress={() => setResetPinStaff(member)}
                              className="min-h-[42px] flex-row items-center rounded-xl border border-[#800020]/20 bg-[#800020]/5 px-3.5 py-2 active:bg-[#800020]/10"
                            >
                              <KeyRound size={15} color="#800020" />
                              <Text className="ml-1.5 text-sm font-bold text-[#800020]">
                                Reset PIN
                              </Text>
                            </Pressable>
                          )}

                          <Pressable
                            onPress={() => handleToggleActiveStatus(member)}
                            className={`min-h-[42px] flex-row items-center rounded-xl border px-3 py-2 ${
                              member.is_active
                                ? 'border-stone-200 bg-white active:bg-rose-50'
                                : 'border-emerald-200 bg-emerald-50 active:bg-emerald-100'
                            }`}
                          >
                            <Power size={15} color={member.is_active ? '#78716c' : '#047857'} />
                            <Text
                              className={`ml-1.5 text-sm font-bold ${
                                member.is_active ? 'text-stone-600' : 'text-emerald-800'
                              }`}
                            >
                              {member.is_active ? 'Deactivate' : 'Activate'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      ) : (
        <View>
          {/* Baseline Policy Banner */}
          <View className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <Text className="text-base font-bold text-amber-900">
              Daily Minimum Shift Rate: ₱{PH_MINIMUM_WAGE_DAILY.toFixed(2)} / shift (PH Minimum Wage
              Baseline)
            </Text>
            <Text className="mt-1 text-base text-amber-800">
              Discretionary jazz night bonuses can be granted by Managers at end of shift for
              stellar table turnovers, bar speed, and venue support.
            </Text>
          </View>

          {/* Staff Attendance & Pay Table */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs">
            <View className="space-y-4">
              {attendance.map((rec) => {
                const isPosUser = rec.user?.is_workflow_staff ?? true;
                const displayRole = isPosUser
                  ? ROLE_LABELS[rec.user?.role || ''] || rec.user?.role
                  : rec.user?.job_title || 'Venue Staff';

                return (
                  <View
                    key={rec.id}
                    className="flex-col md:flex-row md:items-center justify-between border-b border-stone-100 py-4 gap-4"
                  >
                    <View className="flex-row items-center space-x-3">
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-stone-100 border border-stone-200">
                        <Users size={20} color="#44403c" />
                      </View>
                      <View className="ml-3">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-lg font-bold text-stone-900">
                            {rec.user?.display_name || 'Staff Member'}
                          </Text>
                          <View
                            className={`rounded-full px-2 py-0.5 ${
                              isPosUser ? 'bg-emerald-50' : 'bg-purple-50'
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                isPosUser ? 'text-emerald-700' : 'text-purple-700'
                              }`}
                            >
                              {isPosUser ? 'POS User' : 'Venue Staff'}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-base text-stone-500">
                          {displayRole} • Status: {rec.is_present ? 'Present' : 'Absent'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t border-stone-100/70 md:border-t-0">
                      <View className="flex-row items-center justify-between sm:justify-start gap-4 flex-wrap">
                        <View className="items-start sm:items-end">
                          <Text className="text-base text-stone-400">Base Pay</Text>
                          <Text className="text-base font-semibold text-stone-800">
                            ₱{Number(rec.base_daily_pay || 0).toFixed(2)}
                          </Text>
                        </View>

                        <View className="items-start sm:items-end">
                          <Text className="text-base text-stone-400">Bonus</Text>
                          <Text className="text-base font-bold text-emerald-700">
                            +₱{Number(rec.addon_pay || 0).toFixed(2)}
                          </Text>
                        </View>

                        <View className="items-start sm:items-end">
                          <Text className="text-base text-stone-400">Total Pay</Text>
                          <Text className="text-lg font-black text-stone-900">
                            ₱{Number(rec.total_day_pay || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => {
                          setSelectedRecord(rec);
                          setBasePayInput(
                            Number(rec.base_daily_pay || PH_MINIMUM_WAGE_DAILY).toFixed(2)
                          );
                          setAddonPayInput(Number(rec.addon_pay || 0).toFixed(2));
                        }}
                        className="min-h-[48px] px-4 flex-row items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                        accessibilityLabel="Adjust pay and bonus"
                      >
                        <Award size={18} color="#800020" />
                        <Text className="ml-2 text-base font-bold text-[#800020]">
                          Adjust Pay & Bonus
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Modals */}
      <CreateUserAccountModal
        visible={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleMutationSuccess}
      />

      <CreateNonWorkflowStaffModal
        visible={showCreateStaffModal}
        onClose={() => setShowCreateStaffModal(false)}
        onSuccess={handleMutationSuccess}
      />

      <EditStaffModal
        visible={!!editingStaff}
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onSuccess={handleMutationSuccess}
      />

      <ResetPinModal
        visible={!!resetPinStaff}
        staff={resetPinStaff}
        onClose={() => setResetPinStaff(null)}
        onSuccess={handleMutationSuccess}
      />

      {/* Base Pay & Bonus Adjustment Modal */}
      <AdminModal
        visible={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={`Adjust Pay & Bonus: ${selectedRecord?.user?.display_name || ''}`}
        subtitle={`Role: ${
          selectedRecord?.user?.is_workflow_staff
            ? ROLE_LABELS[selectedRecord?.user?.role || ''] || selectedRecord?.user?.role
            : selectedRecord?.user?.job_title || 'Venue Staff'
        } • PH Minimum Wage Baseline: ₱${PH_MINIMUM_WAGE_DAILY.toFixed(2)}`}
        icon={<Award size={22} color="#800020" />}
        size="md"
        footer={
          <>
            <Pressable
              onPress={() => setSelectedRecord(null)}
              className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
            >
              <Text className="text-base font-semibold text-stone-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleUpdateAddon}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
            >
              <Text className="text-base font-bold text-white">Save Pay & Bonus</Text>
            </Pressable>
          </>
        }
      >
        <View className="space-y-4">
          {/* Role-Based Base Pay Quick Presets */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-stone-700">
              Quick Role Pay Tiers (Daily Shift Base)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { label: '₱645 (Min Wage)', value: '645.00' },
                { label: '₱700 (Barista/Floor)', value: '700.00' },
                { label: '₱750 (Cashier)', value: '750.00' },
                { label: '₱850 (Bartender/Tech)', value: '850.00' },
                { label: '₱1,000 (Head Chef)', value: '1000.00' },
                { label: '₱1,200 (Manager)', value: '1200.00' },
              ].map((tier) => {
                const isSelected = parseFloat(basePayInput) === parseFloat(tier.value);
                return (
                  <Pressable
                    key={tier.value}
                    onPress={() => setBasePayInput(tier.value)}
                    className={`rounded-xl border px-3 py-1.5 ${
                      isSelected
                        ? 'border-[#800020] bg-[#800020]'
                        : 'border-stone-200 bg-stone-100 active:bg-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      {tier.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <AdminNumberInput
            label="Base Daily Shift Pay"
            mode="currency"
            value={basePayInput}
            onChangeText={setBasePayInput}
            placeholder="645.00"
            helperText="Adjustable per role/seniority (starts at ₱645.00 PH Minimum Wage)"
          />

          <AdminNumberInput
            label="Discretionary Shift Bonus / Add-on"
            mode="currency"
            value={addonPayInput}
            onChangeText={setAddonPayInput}
            placeholder="e.g. 150.00"
            helperText="Added on top of base daily pay for event rushes or top performance"
          />

          {/* Live Total Shift Pay Preview */}
          <View className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3.5">
            <Text className="text-sm font-bold text-stone-600">Total Shift Pay</Text>
            <Text className="text-xl font-black text-stone-900">
              ₱{((parseFloat(basePayInput) || 0) + (parseFloat(addonPayInput) || 0)).toFixed(2)}
            </Text>
          </View>
        </View>
      </AdminModal>
    </ScrollView>
  );
};
