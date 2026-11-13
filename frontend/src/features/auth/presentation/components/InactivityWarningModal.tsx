import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Clock, AlertTriangle, LogOut, ShieldAlert } from 'lucide-react-native';
import { formatRemainingSeconds } from '../../utils/inactivityPolicy';

interface InactivityWarningModalProps {
  visible: boolean;
  remainingSeconds: number;
  isLateNight: boolean;
  onStaySignedIn: () => void;
  onSignOutNow: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  visible,
  remainingSeconds,
  isLateNight,
  onStaySignedIn,
  onSignOutNow,
}) => {
  if (!visible) return null;

  const thresholdLabel = isLateNight ? '3 hours (Late-Night)' : '6 hours';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onStaySignedIn}>
      <View
        className="flex-1 justify-center items-center px-4"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}
      >
        <View className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl items-center">
          {/* Pulsing Icon Badge */}
          <View className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 justify-center items-center mb-4">
            <Clock size={32} color="#f59e0b" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-white text-center mb-1">
            Session Inactivity Warning
          </Text>

          {/* Subtitle */}
          <Text className="text-sm text-slate-300 text-center mb-4">
            No activity detected for {thresholdLabel}.
          </Text>

          {/* Countdown Badge */}
          <View className="bg-amber-950/60 border border-amber-500/40 rounded-2xl py-3 px-6 mb-4 items-center w-full">
            <Text className="text-xs uppercase tracking-wider text-amber-300 font-semibold mb-1">
              Automatic Sign Out In
            </Text>
            <Text className="text-4xl font-black text-amber-400 font-mono tracking-wider">
              {formatRemainingSeconds(remainingSeconds)}
            </Text>
          </View>

          {/* Fair Accounting Description */}
          <View className="flex-row items-center bg-slate-800/80 rounded-xl p-3 mb-6 border border-slate-700/60">
            <ShieldAlert size={20} color="#38bdf8" style={{ marginRight: 10, flexShrink: 0 }} />
            <Text className="text-xs text-slate-300 flex-1 leading-4">
              To ensure fair attendance tracking for both staff and venue, your shift will be
              completed up to your last active transaction.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={onStaySignedIn}
              activeOpacity={0.8}
              className="w-full bg-amber-500 hover:bg-amber-400 py-3.5 rounded-xl items-center justify-center shadow-lg shadow-amber-500/20"
            >
              <Text className="text-slate-950 font-bold text-base tracking-wide">
                Stay Signed In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSignOutNow}
              activeOpacity={0.7}
              className="w-full bg-slate-800 border border-slate-700 py-3 rounded-xl flex-row items-center justify-center gap-2"
            >
              <LogOut size={16} color="#94a3b8" />
              <Text className="text-slate-300 font-medium text-sm">Sign Out & Clock Out Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
