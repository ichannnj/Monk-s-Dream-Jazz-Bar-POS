import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Clock, ExternalLink, X } from 'lucide-react-native';
import { useAuthStore } from '../../application/useAuthStore';
import { posApi } from '../../../shared/infrastructure/api';
import { realtimeGateway } from '../../../shared/infrastructure/realtime';

/**
 * Subtle, dismissible reminder banner shown on POS terminals when an active
 * non-admin staff member has not clocked in on the Timeclock Kiosk today.
 */
export const AttendanceClockInReminderBanner: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [needsClockIn, setNeedsClockIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = useCallback(async () => {
    if (
      !currentUser?.id ||
      currentUser.role === 'admin' ||
      currentUser.role === 'printer_station'
    ) {
      setNeedsClockIn(false);
      return;
    }
    const status = await posApi.getStaffTodayClockStatus(currentUser.id);
    setNeedsClockIn(!status.isPresentToday);
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    setDismissed(false);
    checkStatus();

    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onAttendanceChange: () => checkStatus(),
      onPosSyncNeeded: () => checkStatus(),
    });

    return () => unsub();
  }, [checkStatus]);

  if (!needsClockIn || dismissed) return null;

  return (
    <View className="mx-3 mt-2 mb-1 flex-row items-center justify-between rounded-xl border border-[#810021]/25 bg-[#F7F5F2] px-3.5 py-2.5 shadow-xs">
      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
        <View className="h-7 w-7 rounded-lg bg-[#810021]/10 items-center justify-center">
          <Clock size={15} color="#810021" />
        </View>
        <Text className="text-xs sm:text-sm font-semibold text-[#1A1617] flex-1">
          You haven't clocked in on the Timeclock Kiosk today.
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {Platform.OS === 'web' && (
          <Pressable
            onPress={() => window.open('?mode=timeclock', '_blank')}
            className="min-h-[36px] px-3 flex-row items-center gap-1 rounded-lg bg-[#810021] active:opacity-90"
          >
            <ExternalLink size={13} color="#F7F5F2" />
            <Text className="text-xs font-bold text-white">Clock In</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setDismissed(true)}
          className="h-8 w-8 items-center justify-center rounded-lg bg-stone-200/70 active:bg-stone-300"
          accessibilityLabel="Dismiss clock-in reminder"
        >
          <X size={14} color="#57534e" />
        </Pressable>
      </View>
    </View>
  );
};
