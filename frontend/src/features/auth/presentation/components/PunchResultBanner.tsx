import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

interface PunchResultBannerProps {
  punchResult: any;
}

export const PunchResultBanner: React.FC<PunchResultBannerProps> = ({ punchResult }) => {
  if (!punchResult) return null;

  const isClockIn = punchResult.actionTaken === 'CLOCKED_IN';

  return (
    <View
      className={`mb-6 rounded-2xl p-4 border ${
        isClockIn ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <View className="flex-row items-center space-x-2">
        <CheckCircle2 size={22} color={isClockIn ? '#047857' : '#b45309'} />
        <Text
          className={`text-lg font-black ml-2 ${isClockIn ? 'text-emerald-900' : 'text-amber-900'}`}
        >
          {punchResult.user.displayName} ({isClockIn ? 'Clocked In' : 'Clocked Out'})
        </Text>
      </View>

      <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Text className="text-sm font-semibold text-stone-700">
          Role: {punchResult.user.jobTitle || punchResult.user.role}
        </Text>
        <Text className="text-sm text-stone-500">
          {isClockIn
            ? `Started: ${new Date(punchResult.clockInAt).toLocaleTimeString()}${punchResult.hoursWorked > 0 ? ` (Resumed · ${punchResult.hoursWorked}h prior)` : ''}`
            : `Finished: ${new Date(punchResult.clockOutAt).toLocaleTimeString()} (${punchResult.hoursWorked} hrs)`}
        </Text>
        <Text className="text-sm font-bold text-stone-800">
          {punchResult.isAdmin || punchResult.user?.role === 'admin'
            ? 'Payroll Exempt'
            : `Shift Base: ₱${Number(punchResult.baseDailyPay).toFixed(2)}`}
        </Text>
      </View>
    </View>
  );
};
