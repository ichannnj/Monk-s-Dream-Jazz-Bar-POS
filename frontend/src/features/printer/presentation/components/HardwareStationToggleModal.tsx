import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Switch } from 'react-native';
import { Printer, X } from 'lucide-react-native';
import { useDeviceHardwareStation } from '../../application/useDeviceHardwareStation';
import { usePrinterStationStore } from '../../application/usePrinterStationStore';

interface HardwareStationToggleModalProps {
  visible: boolean;
  onClose: () => void;
}

export const HardwareStationToggleModal: React.FC<HardwareStationToggleModalProps> = ({
  visible,
  onClose,
}) => {
  const { isHardwareStation, setHardwareStation } = useDeviceHardwareStation();
  const {
    connectionStatus,
    portInfo,
    connectDevice,
    disconnectDevice,
    testKickDrawer,
    isSupported,
  } = usePrinterStationStore();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-4">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
            <View className="flex-row items-center space-x-3">
              <View className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 items-center justify-center">
                <Printer size={20} color="#d97706" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-jazz-text">
                  Hardware Station Settings
                </Text>
                <Text className="text-xs text-stone-500">
                  Bind physical printer &amp; cash drawer to this device
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* Toggle Card */}
          <View className="my-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-bold text-stone-900">
                Set as Venue Hardware Station
              </Text>
              <Text className="text-xs text-stone-500 mt-0.5">
                Enables this PC to listen to all venue orders and pop the cash drawer on cash sales,
                even while locked.
              </Text>
            </View>
            <Switch
              value={isHardwareStation}
              onValueChange={(val) => {
                setHardwareStation(val);
                if (val && connectionStatus !== 'CONNECTED') {
                  connectDevice();
                }
              }}
              trackColor={{ false: '#d6d3d1', true: '#d97706' }}
              thumbColor="#ffffff"
            />
          </View>

          {isHardwareStation && (
            <View className="space-y-3 mb-4">
              {/* Connection Status Indicator */}
              <View className="p-3.5 rounded-xl border border-stone-200 bg-white">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-2">
                    <Printer size={16} color="#78716c" />
                    <Text className="text-xs font-semibold text-stone-700">
                      80mm Thermal Printer:
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View
                      className={`h-2 w-2 rounded-full mr-1.5 ${
                        connectionStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        connectionStatus === 'CONNECTED' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {connectionStatus}
                    </Text>
                  </View>
                </View>

                {connectionStatus === 'CONNECTED' && portInfo && (
                  <View className="mt-2 pt-2 border-t border-stone-100 flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-bold text-stone-800 flex-1 mr-2"
                      numberOfLines={1}
                    >
                      {portInfo.deviceName || 'USB Thermal Printer'}
                      {portInfo.manufacturerName ? ` • ${portInfo.manufacturerName}` : ''}
                    </Text>
                    <View className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                      <Text className="text-[10px] font-mono font-medium text-stone-600">
                        {portInfo.type === 'usb'
                          ? `USB (VID: 0x${portInfo.usbVendorId?.toString(16) || '?'})`
                          : portInfo.type === 'bridge'
                            ? 'Linux /dev/usb/lp0'
                            : 'Serial Port'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-2">
                {connectionStatus === 'CONNECTED' ? (
                  <Pressable
                    onPress={disconnectDevice}
                    className="flex-1 py-2.5 rounded-xl bg-stone-100 items-center justify-center active:bg-stone-200"
                  >
                    <Text className="text-xs font-bold text-stone-700">Disconnect</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => connectDevice()}
                    disabled={!isSupported}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 items-center justify-center active:bg-amber-600 disabled:opacity-50"
                  >
                    <Text className="text-xs font-bold text-stone-950">Pair USB Printer</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => testKickDrawer()}
                  disabled={connectionStatus !== 'CONNECTED'}
                  className="flex-1 py-2.5 rounded-xl border border-amber-500/40 bg-amber-50 items-center justify-center active:bg-amber-100 disabled:opacity-40"
                >
                  <Text className="text-xs font-bold text-amber-800">⚡ Test Drawer Kick</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Close Action */}
          <Pressable
            onPress={onClose}
            className="w-full py-3 rounded-xl bg-stone-900 items-center justify-center active:bg-stone-800 mt-2"
          >
            <Text className="text-sm font-bold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
