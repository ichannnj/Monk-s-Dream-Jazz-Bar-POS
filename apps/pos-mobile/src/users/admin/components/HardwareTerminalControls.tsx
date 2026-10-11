import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Printer, Unlock, RefreshCw, Server, ShieldCheck } from 'lucide-react-native';

export const HardwareTerminalControls: React.FC = () => {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleKickDrawer = () => {
    setLastAction('Cash Drawer Pulse Command sent to /dev/usb/receipt-printer');
    setTimeout(() => setLastAction(null), 3000);
  };

  const handleTestPrint = () => {
    setLastAction('ESC/POS Test Slip dispatched to Thermal Receipt Printer');
    setTimeout(() => setLastAction(null), 3000);
  };

  return (
    <View className="bg-jazz-900 border border-jazz-800 rounded-2xl p-4">
      <View className="flex-row items-center justify-between pb-3 border-b border-jazz-800 mb-3">
        <View className="flex-row items-center space-x-2">
          <Server size={18} color="#f59e0b" />
          <Text className="text-white font-extrabold text-sm">
            Counter PC & Hardware Terminal Controls
          </Text>
        </View>
        <View className="flex-row items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800">
          <ShieldCheck size={12} color="#10b981" />
          <Text className="text-[10px] text-emerald-400 font-bold ml-1">
            Admin Auth Active
          </Text>
        </View>
      </View>

      {lastAction && (
        <View className="mb-3 p-2.5 rounded-xl bg-jazz-gold/15 border border-jazz-gold/40">
          <Text className="text-jazz-gold text-xs font-semibold">{lastAction}</Text>
        </View>
      )}

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={handleKickDrawer}
          className="flex-1 p-3 rounded-xl bg-jazz-850 border border-jazz-750 flex-col items-center justify-center space-y-1.5"
        >
          <Unlock size={20} color="#f59e0b" />
          <Text className="text-xs font-bold text-white">Kick Cash Drawer</Text>
          <Text className="text-[10px] text-gray-400">RJ-11 solenoid 50ms</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTestPrint}
          className="flex-1 p-3 rounded-xl bg-jazz-850 border border-jazz-750 flex-col items-center justify-center space-y-1.5"
        >
          <Printer size={20} color="#60a5fa" />
          <Text className="text-xs font-bold text-white">Test Receipt Print</Text>
          <Text className="text-[10px] text-gray-400">ESC/POS 80mm binary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 p-3 rounded-xl bg-jazz-850 border border-jazz-750 flex-col items-center justify-center space-y-1.5"
        >
          <RefreshCw size={20} color="#34d399" />
          <Text className="text-xs font-bold text-white">HLC Cloud Sync</Text>
          <Text className="text-[10px] text-gray-400">Outbox 0 pending</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
