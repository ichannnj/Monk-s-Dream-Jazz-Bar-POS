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
  ShieldCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import type { SerialPortInfo } from '../../services/webSerialPrinter';
import type { PrinterTransportMode } from '../../application/usePrinterStationStore';

const BAUD_RATE_OPTIONS: PosDropdownOption<string>[] = [
  { value: '9600', label: '9600 baud', description: 'Standard ESC/POS thermal printers (Default)' },
  { value: '19200', label: '19200 baud', description: 'Medium speed thermal printers' },
  { value: '38400', label: '38400 baud', description: 'High speed serial printers' },
  { value: '115200', label: '115200 baud', description: 'Ultra high speed USB-VCP printers' },
];

const PAPER_WIDTH_OPTIONS: PosDropdownOption<string>[] = [
  { value: '58mm', label: '58mm Roll', description: 'Compact 32-column thermal roll (Default)' },
  { value: '80mm', label: '80mm Roll', description: 'Standard 48-column thermal roll' },
];

const TRANSPORT_OPTIONS: PosDropdownOption<string>[] = [
  {
    value: 'auto',
    label: 'Auto (USB/Serial)',
    description: 'Auto-detect WebUSB with Serial fallback',
  },
  { value: 'usb', label: 'WebUSB Direct', description: 'Raw USB bulk transfer (Class 07)' },
  { value: 'serial', label: 'WebSerial (COM)', description: 'Virtual COM port (CH340/FTDI/CDC)' },
  {
    value: 'bridge',
    label: 'Local Bridge',
    description: 'Windows Spooler / Linux Daemon (127.0.0.1:12111)',
  },
];

interface HardwareStationTelemetryCardsProps {
  connectionStatus: string;
  drawerStatus: string;
  isSupported: boolean;
  portInfo: SerialPortInfo | null;
  lastError?: string | null;
  baudRate: number;
  paperWidth?: '80mm' | '58mm' | '57mm';
  preferredTransport?: PrinterTransportMode;
  autoPrintEnabled: boolean;
  chimeEnabled: boolean;
  isTestingChit: boolean;
  isTestingReceipt: boolean;
  isTestingDrawer: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onForgetDevice?: () => void;
  onSetBaudRate: (rate: number) => void;
  onSetPaperWidth?: (width: '80mm' | '58mm' | '57mm') => void;
  onSetTransport?: (mode: PrinterTransportMode) => void;
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
  lastError,
  baudRate,
  paperWidth = '58mm',
  preferredTransport = 'auto',
  autoPrintEnabled,
  chimeEnabled,
  isTestingChit,
  isTestingReceipt,
  isTestingDrawer,
  onConnect,
  onDisconnect,
  onForgetDevice,
  onSetBaudRate,
  onSetPaperWidth,
  onSetTransport,
  onToggleAutoPrint,
  onToggleChime,
  onTestPrintChit,
  onTestPrintReceipt,
  onTestKickDrawer,
}) => {
  return (
    <View className="p-4 sm:p-6 pb-2">
      <View className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Printer Status & Device Selection */}
        <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
            <View className="flex-row items-center space-x-2">
              <Printer size={18} color="#94a3b8" />
              <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                {paperWidth} Thermal Printer
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
                <Text className="ml-1.5 text-xs font-bold text-rose-400">
                  {connectionStatus === 'ERROR' ? 'DRIVER BLOCKED' : 'OFFLINE'}
                </Text>
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
                  ? `${portInfo?.type === 'usb' ? 'Direct WebUSB' : portInfo?.type === 'bridge' ? 'Linux Bridge (/dev/usb/lp0)' : 'Serial Port'}${portInfo?.manufacturerName ? ` • ${portInfo.manufacturerName}` : ''}${portInfo?.usbVendorId ? ` (VID: 0x${portInfo.usbVendorId.toString(16).toUpperCase()}, PID: 0x${portInfo.usbProductId?.toString(16).toUpperCase()})` : ''}${portInfo?.endpointOut ? ` • EP ${portInfo.endpointOut}` : ''}`
                  : !isSupported
                    ? 'WebUSB / WebSerial is not supported in this browser. Please use Chrome or Edge.'
                    : 'Thermal printer offline. Click Pair Device to select from USB/Serial devices.'}
              </Text>
            </View>

            {/* Hardware Isolation Badge */}
            <View className="mt-2 flex-row items-center space-x-1.5 rounded-lg bg-stone-900/90 border border-stone-800/80 px-2.5 py-1">
              <ShieldCheck size={13} color="#10b981" />
              <Text className="text-[10px] font-medium text-stone-400">
                Peripheral Isolation Active (Mouse &amp; KB Protected)
              </Text>
            </View>

            {connectionStatus !== 'CONNECTED' && lastError ? (
              <View className="mt-2 rounded-lg bg-rose-950/60 border border-rose-500/40 px-2.5 py-2">
                <Text className="text-[11px] font-semibold text-rose-300 leading-relaxed">
                  {lastError}
                </Text>
              </View>
            ) : null}

            <View className="mt-3 flex-row items-center space-x-2">
              {connectionStatus === 'CONNECTED' ? (
                <>
                  <Pressable
                    onPress={onConnect}
                    className="flex-1 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 items-center justify-center active:bg-amber-500/25 flex-row space-x-1"
                  >
                    <RefreshCw size={12} color="#f59e0b" />
                    <Text className="text-xs font-bold text-amber-400 ml-1">Change Device</Text>
                  </Pressable>
                  <Pressable
                    onPress={onDisconnect}
                    className="flex-1 py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700"
                  >
                    <Text className="text-xs font-bold text-stone-300">Disconnect</Text>
                  </Pressable>
                  {onForgetDevice && (
                    <Pressable
                      onPress={onForgetDevice}
                      className="px-2.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 items-center justify-center active:bg-rose-500/20"
                      accessibilityLabel="Forget Device"
                    >
                      <Trash2 size={13} color="#f43f5e" />
                    </Pressable>
                  )}
                </>
              ) : (
                <Pressable
                  onPress={onConnect}
                  disabled={!isSupported || connectionStatus === 'CONNECTING'}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 items-center justify-center active:bg-amber-600 disabled:opacity-50"
                >
                  <Text className="text-xs font-extrabold text-stone-950">
                    Pair Thermal Printer
                  </Text>
                </Pressable>
              )}

              {onSetTransport && (
                <View className="w-28">
                  <PosDropdown
                    options={TRANSPORT_OPTIONS}
                    value={preferredTransport}
                    onChange={(val) => onSetTransport(val as PrinterTransportMode)}
                    sheetTitle="Transport Mode"
                    className="h-[36px]"
                  />
                </View>
              )}

              {onSetPaperWidth && (
                <View className="w-24">
                  <PosDropdown
                    options={PAPER_WIDTH_OPTIONS}
                    value={paperWidth}
                    onChange={(val) => onSetPaperWidth(val as '80mm' | '58mm' | '57mm')}
                    sheetTitle="Paper Width"
                    className="h-[36px]"
                  />
                </View>
              )}

              <View className="w-24">
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
                {autoPrintEnabled ? 'Auto-Print: ON' : 'Auto-Print: OFF'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onToggleChime}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                chimeEnabled
                  ? 'border-amber-600/40 bg-amber-950/40 text-amber-400'
                  : 'border-stone-800 bg-stone-900 text-stone-400'
              }`}
            >
              {chimeEnabled ? (
                <Volume2 size={14} color="#f59e0b" />
              ) : (
                <VolumeX size={14} color="#78716c" />
              )}
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  chimeEnabled ? 'text-amber-400' : 'text-stone-400'
                }`}
              >
                {chimeEnabled ? 'Audio Chime: ON' : 'Muted'}
              </Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={onTestPrintChit}
              disabled={isTestingChit || connectionStatus !== 'CONNECTED'}
              className="flex-1 py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700 disabled:opacity-40"
            >
              <Text className="text-xs font-bold text-stone-300">
                {isTestingChit ? 'Printing Chit...' : 'Test Chit'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onTestPrintReceipt}
              disabled={isTestingReceipt || connectionStatus !== 'CONNECTED'}
              className="flex-1 py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700 disabled:opacity-40"
            >
              <Text className="text-xs font-bold text-stone-300">
                {isTestingReceipt ? 'Printing...' : 'Test Receipt'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};
