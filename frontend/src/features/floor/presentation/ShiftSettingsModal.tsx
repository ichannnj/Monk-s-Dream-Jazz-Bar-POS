import React, { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';
import { User, Printer, LogOut, Sparkles, ExternalLink } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import { getStaffInitials, getStaffRoleLabel } from '@/features/shared/utils/staffHelpers';
import { FloorSectionHeader } from '@/features/shared';
import { HardwareStationToggleModal, useDeviceHardwareStation } from '@/features/printer';

interface ShiftSettingsModalProps {
  onClose?: () => void;
  onLogout?: () => void;
  onLock?: () => void;
  onClockOut?: () => void;
}

export const ShiftSettingsModal: React.FC<ShiftSettingsModalProps> = ({ onLogout, onLock }) => {
  const { currentUser, isTrainingMode, setIsTrainingMode } = useAuthStore();
  const isHardwareStation = useDeviceHardwareStation((s) => s.isHardwareStation);
  const [stationModalVisible, setStationModalVisible] = useState(false);

  return (
    <ScrollView className="flex-1 bg-[#EFECE6]" showsVerticalScrollIndicator={false}>
      <FloorSectionHeader
        title="Station & Shift Settings"
        subtitle="Staff session, training sandbox, and thermal printer station"
      />

      <View className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
        {/* Staff Profile Card */}
        <View className="bg-white rounded-2xl p-5 border border-[#E2DED6] justify-between gap-4">
          <View>
            <View className="flex-row items-center gap-2 mb-4">
              <User size={18} color="#810021" />
              <Text className="text-pos-lg font-bold text-[#1A1617]">Active Staff Profile</Text>
            </View>

            <View className="flex-row items-center gap-3.5">
              <View className="w-12 h-12 rounded-full bg-[#810021]/10 border border-[#810021]/20 items-center justify-center shrink-0">
                <Text className="text-base font-extrabold text-[#810021]">
                  {getStaffInitials(currentUser?.displayName || 'Floor Staff')}
                </Text>
              </View>

              <View className="min-w-0 flex-1">
                <Text className="text-pos-lg font-bold text-[#1A1617]" numberOfLines={1}>
                  {currentUser?.displayName || 'Floor Staff'}
                </Text>
                <Text className="text-base text-[#57534E] mt-0.5" numberOfLines={1}>
                  {getStaffRoleLabel(currentUser?.role)} ·{' '}
                  {currentUser?.username ? `@${currentUser.username}` : 'Floor Authenticated'}
                </Text>
                {currentUser?.email ? (
                  <Text className="text-base text-[#78716C] mt-0.5" numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <Pressable
            onPress={onLogout || onLock}
            className="min-h-[48px] w-full rounded-xl bg-[#810021] px-4 flex-row items-center justify-center gap-2 active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Log Out and Switch Staff"
          >
            <LogOut size={18} color="#F7F5F2" />
            <Text className="text-base font-semibold text-white">Log Out / Switch Staff</Text>
          </Pressable>
        </View>

        {/* Training Mode Card */}
        <View className="bg-white rounded-2xl p-5 border border-[#E2DED6] justify-between gap-4">
          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Sparkles size={18} color="#B45309" />
              <Text className="text-pos-lg font-bold text-[#1A1617]">Training Mode Sandbox</Text>
            </View>

            <Text className="text-base text-[#57534E] leading-relaxed">
              Practice ordering, tab splits, and settlements without sending tickets to physical KDS
              stations or depleting active inventory.
            </Text>
          </View>

          <View className="min-h-[52px] flex-row items-center justify-between bg-[#EFECE6] border border-[#E2DED6] px-4 py-2.5 rounded-xl">
            <Text className="text-base font-semibold text-[#1A1617]">
              {isTrainingMode ? 'Sandbox Active (Demo)' : 'Live Production Mode'}
            </Text>
            <Switch
              value={isTrainingMode}
              onValueChange={(val) => {
                setIsTrainingMode(val);
                if (val) {
                  toast.info(
                    "Training Sandbox Mode active — tickets won't route to live stations.",
                    { title: 'Sandbox Mode ON' }
                  );
                } else {
                  toast.info('Live Production Mode active.', { title: 'Live Mode' });
                }
              }}
              trackColor={{ false: '#D6D3D1', true: '#FDE68A' }}
              thumbColor={isTrainingMode ? '#D97706' : '#EFECE6'}
            />
          </View>
        </View>

        {/* Hardware Print Station Card */}
        <View className="bg-white rounded-2xl p-5 border border-[#E2DED6] justify-between gap-4 md:col-span-2">
          <View>
            <View className="flex-row flex-wrap items-center justify-between gap-2 mb-3">
              <View className="flex-row items-center gap-2">
                <Printer size={18} color="#810021" />
                <Text className="text-pos-lg font-bold text-[#1A1617]">
                  Hardware Print &amp; Cash Drawer Station
                </Text>
              </View>

              <View
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${
                  isHardwareStation
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-[#EFECE6] border-[#E2DED6]'
                }`}
              >
                <View
                  className={`w-2 h-2 rounded-full ${
                    isHardwareStation ? 'bg-emerald-500' : 'bg-[#78716C]'
                  }`}
                />
                <Text
                  className={`text-base font-semibold ${
                    isHardwareStation ? 'text-emerald-800' : 'text-[#57534E]'
                  }`}
                >
                  {isHardwareStation ? 'This Device Bound' : 'Standard Terminal'}
                </Text>
              </View>
            </View>

            <Text className="text-base text-[#57534E] leading-relaxed">
              Thermal receipts, runner chits, and RJ11 cash drawer kicks are driven via WebUSB /
              WebSerial on the dedicated Hardware Print Station tab.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            <Pressable
              onPress={() => setStationModalVisible(true)}
              className="min-h-[48px] flex-1 min-w-[200px] rounded-xl bg-[#EFECE6] border border-[#E2DED6] px-4 flex-row items-center justify-center gap-2 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Configure Hardware Print Station"
            >
              <Printer size={18} color="#1A1617" />
              <Text className="text-base font-semibold text-[#1A1617]">
                Configure Device Station
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.open('?mode=printer', '_blank');
                }
              }}
              className="min-h-[48px] flex-1 min-w-[200px] rounded-xl bg-white border border-[#E2DED6] px-4 flex-row items-center justify-center gap-2 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Open Dedicated Print Station Tab"
            >
              <ExternalLink size={18} color="#810021" />
              <Text className="text-base font-semibold text-[#810021]">Open Print Station Tab</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <HardwareStationToggleModal
        visible={stationModalVisible}
        onClose={() => setStationModalVisible(false)}
      />
    </ScrollView>
  );
};
