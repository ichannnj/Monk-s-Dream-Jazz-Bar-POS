import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import {
  Printer,
  Coins,
  Radio,
  Zap,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import type { SerialPortInfo } from '../../services/webSerialPrinter';

const BAUD_RATE_OPTIONS: PosDropdownOption<string>[] = [
  { value: '9600', label: '9600 baud', description: 'Standard ESC/POS thermal printers (Default)' },
  { value: '19200', label: '19200 baud', description: 'Medium speed thermal printers' },
  { value: '38400', label: '38400 baud', description: 'High speed serial printers' },
  { value: '115200', label: '115200 baud', description: 'Ultra high speed USB-VCP printers' },
];

interface HardwareStationTelemetryCardsProps {
  connectionStatus: string;
  drawerStatus: string;
  isSupported: boolean;
  portInfo: SerialPortInfo | null;
  baudRate: number;
  autoPrintEnabled: boolean;
  chimeEnabled: boolean;
  isTestingChit: boolean;
  isTestingReceipt: boolean;
  isTestingDrawer: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSetBaudRate: (rate: number) => void;
  onToggleAutoPrint: () => void;
  onToggleChime: () => void;
  onTestPrintChit: () => void;
  onTestPrintReceipt: () => void;
  onTestKickDrawer: () => void;
}

export const HardwareStationTelemetryCards: React.FC<HardwareStationTelemetryCardsProps> = ({
  connectionStatus,
  drawerStatus,
  isSupported,
  portInfo,
  baudRate,
  autoPrintEnabled,
  chimeEnabled,
  isTestingChit,
  isTestingReceipt,
  isTestingDrawer,
  onConnect,
  onDisconnect,
  onSetBaudRate,
  onToggleAutoPrint,
  onToggleChime,
  onTestPrintChit,
  onTestPrintReceipt,
  onTestKickDrawer,
}) => {
  return (
    <View className="p-4 sm:p-6 pb-2">
      <View className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Printer Status */}
        <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
            <View className="flex-row items-center space-x-2">
              <Printer size={18} color="#94a3b8" />
              <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                80mm Thermal Printer
              </Text>
            </View>
            {connectionStatus === 'CONNECTED' ? (
              <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
                <View className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <Text className="ml-1.5 text-xs font-bold text-emerald-400">ONLINE</Text>
              </View>
            ) : connectionStatus === 'CONNECTING' ? (
              <View className="flex-row items-center rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5">
                <ActivityIndicator size="small" color="#38bdf8" />
                <Text className="ml-1.5 text-xs font-bold text-sky-400">CONNECTING</Text>
              </View>
            ) : (
              <View className="flex-row items-center rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5">
                <View className="h-2 w-2 rounded-full bg-rose-500" />
                <Text className="ml-1.5 text-xs font-bold text-rose-400">OFFLINE</Text>
              </View>
            )}
          </View>

          <View className="mt-3">
            <View className="space-y-1">
              <Text className="text-xs text-stone-300 font-semibold" numberOfLines={1}>
                {connectionStatus === 'CONNECTED'
                  ? portInfo?.deviceName || 'USB Thermal Printer'
                  : 'No Thermal Printer Connected'}
              </Text>
              <Text className="text-[11px] text-stone-500">
                {connectionStatus === 'CONNECTED'
                  ? `${portInfo?.type === 'usb' ? 'Direct WebUSB' : portInfo?.type === 'bridge' ? 'Linux Bridge (/dev/usb/lp0)' : 'Serial Port'}${portInfo?.manufacturerName ? ` • ${portInfo.manufacturerName}` : ''}${portInfo?.usbVendorId ? ` (VID: 0x${portInfo.usbVendorId.toString(16).toUpperCase()})` : ''}`
                  : !isSupported
                    ? 'WebUSB is not supported in this browser. Please use Chrome or Edge.'
                    : 'Printer disconnected. Click Pair USB Device to connect.'}
              </Text>
            </View>

            <View className="mt-3 flex-row items-center space-x-2">
              {connectionStatus === 'CONNECTED' ? (
                <Pressable
                  onPress={onDisconnect}
                  className="flex-1 py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700"
                >
                  <Text className="text-xs font-bold text-stone-300">Disconnect</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onConnect}
                  disabled={!isSupported || connectionStatus === 'CONNECTING'}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 items-center justify-center active:bg-amber-600 disabled:opacity-50"
                >
                  <Text className="text-xs font-extrabold text-stone-950">Pair USB Device</Text>
                </Pressable>
              )}

              <View className="w-32">
                <PosDropdown
                  options={BAUD_RATE_OPTIONS}
                  value={String(baudRate)}
                  onChange={(rate) => onSetBaudRate(Number(rate))}
                  sheetTitle="Baud Rate"
                  className="h-[36px]"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Card 2: Cash Drawer Status */}
        <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
            <View className="flex-row items-center space-x-2">
              <Coins size={18} color="#f59e0b" />
              <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                Cash Drawer (RJ11/12)
              </Text>
            </View>
            {drawerStatus === 'KICKING' ? (
              <View className="flex-row items-center rounded-full bg-amber-500/20 border border-amber-500 px-2.5 py-0.5 animate-pulse">
                <Zap size={12} color="#f59e0b" />
                <Text className="ml-1 text-xs font-bold text-amber-400">PULSING</Text>
              </View>
            ) : (
              <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
                <CheckCircle2 size={12} color="#10b981" />
                <Text className="ml-1 text-xs font-bold text-emerald-400">READY</Text>
              </View>
            )}
          </View>

          <View className="mt-3">
            <Text className="text-xs text-stone-400">
              Connected to Printer DK Port (ESC p 0 25 250). Auto-kicks on Cash settlement &amp;
              manual till operations.
            </Text>

            <View className="mt-3">
              <Pressable
                onPress={onTestKickDrawer}
                disabled={isTestingDrawer || connectionStatus !== 'CONNECTED'}
                className="py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 items-center justify-center active:bg-amber-500/20 disabled:opacity-40"
              >
                <Text className="text-xs font-bold text-amber-400">
                  {isTestingDrawer ? 'Firing Solenoid...' : '⚡ Test Kick Cash Drawer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Card 3: Automation & Audio Engine */}
        <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
            <View className="flex-row items-center space-x-2">
              <Radio size={18} color="#38bdf8" />
              <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                Automation &amp; Sound
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
              <View className="h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="ml-1.5 text-xs font-bold text-emerald-400">CDC SYNCED</Text>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between gap-2">
            <Pressable
              onPress={onToggleAutoPrint}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                autoPrintEnabled
                  ? 'border-emerald-600/40 bg-emerald-950/40 text-emerald-400'
                  : 'border-stone-800 bg-stone-900 text-stone-400'
              }`}
            >
              {autoPrintEnabled ? (
                <CheckCircle2 size={14} color="#10b981" />
              ) : (
                <Clock size={14} color="#78716c" />
              )}
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  autoPrintEnabled ? 'text-emerald-400' : 'text-stone-400'
                }`}
              >
                Auto-Print: {autoPrintEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onToggleChime}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                chimeEnabled
                  ? 'border-sky-600/40 bg-sky-950/40 text-sky-400'
                  : 'border-stone-800 bg-stone-900 text-stone-400'
              }`}
            >
              {chimeEnabled ? (
                <Volume2 size={14} color="#38bdf8" />
              ) : (
                <VolumeX size={14} color="#78716c" />
              )}
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  chimeEnabled ? 'text-sky-400' : 'text-stone-400'
                }`}
              >
                Chime: {chimeEnabled ? 'ON' : 'MUTED'}
              </Text>
            </Pressable>
          </View>

          <View className="mt-2.5 flex-row gap-2">
            <Pressable
              onPress={onTestPrintChit}
              disabled={isTestingChit || connectionStatus !== 'CONNECTED'}
              className="flex-1 py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700 disabled:opacity-40"
            >
              <Text className="text-xs font-bold text-stone-300">
                {isTestingChit ? 'Printing...' : 'Test Runner Chit'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onTestPrintReceipt}
              disabled={isTestingReceipt || connectionStatus !== 'CONNECTED'}
              className="flex-1 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 items-center justify-center active:bg-amber-500/20 disabled:opacity-40"
            >
              <Text className="text-xs font-bold text-amber-400">
                {isTestingReceipt ? 'Printing...' : 'Test Customer Receipt'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};
