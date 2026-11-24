import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Settings,
  Percent,
  Receipt,
  Printer,
  Check,
  Save,
  Building,
  ExternalLink,
  Clock,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { realtimeGateway, useWindowVisibilitySync } from '@/features/shared';
import { adminApi, type VenueSettings } from '../../data/admin.api';
import { AdminInput } from '../components/AdminInput';
import { AdminNumberInput } from '../components/AdminNumberInput';
import { AdminQrPaymentManager } from '../components/AdminQrPaymentManager';
import { PosActionButton } from '@/features/shared/ui/PosActionButton';

interface AdminSettingsViewProps {
  onRefresh?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onRefresh }) => {
  const [settings, setSettings] = useState<VenueSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [venueName, setVenueName] = useState("Monk's Dream Jazz Bar");
  const [dailyOverhead, setDailyOverhead] = useState('150.00');
  const [vatRate, setVatRate] = useState('12.00');
  const [vatInclusive, setVatInclusive] = useState(true);
  const [serviceChargeRate, setServiceChargeRate] = useState('10.00');
  const [cafeFoodServiceChargeRate, setCafeFoodServiceChargeRate] = useState('10.00');
  const [eventServiceChargeRate, setEventServiceChargeRate] = useState('10.00');
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);

  // Discounts & Comps State
  const [seniorPwdPercent, setSeniorPwdPercent] = useState('20');
  const [musicianCompPercent, setMusicianCompPercent] = useState('100');
  const [staffDiscountPercent, setStaffDiscountPercent] = useState('50');

  // Printer Hardware Routing
  const [barPrinterIp, setBarPrinterIp] = useState('192.168.1.101');
  const [kitchenPrinterIp, setKitchenPrinterIp] = useState('192.168.1.102');
  const [runnerPrinterIp, setRunnerPrinterIp] = useState('192.168.1.103');

  // Attendance & Overtime Policy
  const [standardShiftHours, setStandardShiftHours] = useState('8.00');
  const [overtimeGraceMinutes, setOvertimeGraceMinutes] = useState('15');
  const [overtimeRateMode, setOvertimeRateMode] = useState<'MULTIPLIER' | 'FLAT_HOURLY'>(
    'MULTIPLIER'
  );
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.25');
  const [overtimeFlatHourlyRate, setOvertimeFlatHourlyRate] = useState('100.00');

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const s = await adminApi.getVenueSettings();
      setSettings(s);
      setVenueName(s.venue_name || "Monk's Dream Jazz Bar");
      setDailyOverhead((s.daily_overhead_cost || 150).toString());
      setVatRate((s.vat_rate ?? 12).toString());
      setVatInclusive(s.vat_inclusive ?? true);
      setServiceChargeRate((s.service_charge_rate ?? 10).toString());
      setCafeFoodServiceChargeRate((s.cafe_food_service_charge_rate ?? 10).toString());
      setEventServiceChargeRate((s.event_service_charge_rate ?? 10).toString());
      setServiceChargeEnabled(s.service_charge_enabled ?? true);

      if (s.discounts_config) {
        setSeniorPwdPercent((s.discounts_config.senior_pwd_percent ?? 20).toString());
        setMusicianCompPercent((s.discounts_config.musician_comp_percent ?? 100).toString());
        setStaffDiscountPercent((s.discounts_config.staff_discount_percent ?? 50).toString());
      }

      if (s.printer_routing_config) {
        setBarPrinterIp(s.printer_routing_config.bar_printer_ip || '192.168.1.101');
        setKitchenPrinterIp(s.printer_routing_config.kitchen_printer_ip || '192.168.1.102');
        setRunnerPrinterIp(s.printer_routing_config.runner_printer_ip || '192.168.1.103');
      }

      setStandardShiftHours((s.standard_shift_hours ?? 8).toString());
      setOvertimeGraceMinutes((s.overtime_grace_minutes ?? 15).toString());
      setOvertimeRateMode(s.overtime_rate_mode === 'FLAT_HOURLY' ? 'FLAT_HOURLY' : 'MULTIPLIER');
      setOvertimeMultiplier((s.overtime_multiplier ?? 1.25).toString());
      setOvertimeFlatHourlyRate((s.overtime_flat_hourly_rate ?? 100).toString());
    } catch {
      toast.error('Failed to load venue configurations', { title: 'Load Error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useWindowVisibilitySync(fetchSettings);

  useEffect(() => {
    fetchSettings();

    const interval = setInterval(() => {
      fetchSettings();
    }, 15000);

    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onPosSyncNeeded: () => fetchSettings(),
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [fetchSettings]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await adminApi.updateVenueSettings({
        venue_name: venueName.trim(),
        daily_overhead_cost: parseFloat(dailyOverhead) || 150,
        vat_rate: parseFloat(vatRate) || 12,
        vat_inclusive: vatInclusive,
        service_charge_rate: parseFloat(serviceChargeRate) || 10,
        cafe_food_service_charge_rate: parseFloat(cafeFoodServiceChargeRate) || 10,
        event_service_charge_rate: parseFloat(eventServiceChargeRate) || 10,
        service_charge_enabled: serviceChargeEnabled,
        discounts_config: {
          senior_pwd_percent: parseFloat(seniorPwdPercent) || 20,
          musician_comp_percent: parseFloat(musicianCompPercent) || 100,
          staff_discount_percent: parseFloat(staffDiscountPercent) || 50,
        },
        printer_routing_config: {
          bar_printer_ip: barPrinterIp.trim(),
          kitchen_printer_ip: kitchenPrinterIp.trim(),
          runner_printer_ip: runnerPrinterIp.trim(),
        },
        standard_shift_hours: parseFloat(standardShiftHours) || 8,
        overtime_grace_minutes: parseInt(overtimeGraceMinutes, 10) || 15,
        overtime_rate_mode: overtimeRateMode,
        overtime_multiplier: parseFloat(overtimeMultiplier) || 1.25,
        overtime_flat_hourly_rate: parseFloat(overtimeFlatHourlyRate) || 100,
      });

      toast.success('Venue taxes, discounts, and printer settings updated', {
        title: 'Settings Saved',
      });
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update venue settings', { title: 'Save Error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#EFECE6] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-5 flex-row items-center justify-between gap-3 flex-wrap">
        <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          Venue Settings
        </Text>

        <PosActionButton
          label="Save Settings"
          loadingLabel="Saving…"
          variant="primary"
          icon={Save}
          loading={isSaving}
          onPress={handleSaveAll}
          accessibilityLabel="Save venue settings"
        />
      </View>

      <View className="space-y-5">
        {/* SECTION 0: GENERAL VENUE IDENTITY */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <View className="flex-row items-center gap-2 border-b border-stone-100 pb-2.5">
            <Building size={18} color="#810021" />
            <Text className="text-base font-bold text-stone-900">
              Venue Identity &amp; Overhead
            </Text>
          </View>

          <View className="flex-col md:flex-row gap-4">
            <View className="flex-1">
              <AdminInput
                label="Registered Business / Venue Name"
                value={venueName}
                onChangeText={setVenueName}
                placeholder="Monk's Dream Jazz Bar"
              />
            </View>
            <View className="w-full md:w-64">
              <AdminNumberInput
                label="Daily Overhead Allocation"
                mode="currency"
                value={dailyOverhead}
                onChangeText={setDailyOverhead}
                placeholder="150.00"
                helperText="Fixed venue utilities per day"
              />
            </View>
          </View>
        </View>

        {/* SECTION 1: TAXES & SERVICE CHARGE */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <View className="flex-row items-center gap-2 border-b border-stone-100 pb-2.5">
            <Percent size={18} color="#810021" />
            <Text className="text-base font-bold text-stone-900">Taxes &amp; Service Charge</Text>
          </View>

          <View className="flex-col md:flex-row items-start gap-4">
            <View className="flex-1 w-full">
              <AdminNumberInput
                label="VAT Rate"
                mode="decimal"
                value={vatRate}
                onChangeText={setVatRate}
                placeholder="12.00"
                suffix="%"
                helperText="Standard Philippine BIR VAT"
              />
            </View>

            <View className="flex-1 w-full md:pt-6">
              <Pressable
                onPress={() => setVatInclusive(!vatInclusive)}
                className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border transition-all ${
                  vatInclusive ? 'bg-[#810021]/10 border-[#810021]' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <View>
                  <Text className="text-base font-bold text-stone-900">
                    Prices are Tax-Inclusive
                  </Text>
                  <Text className="text-base text-stone-500">Menu prices include 12% VAT</Text>
                </View>
                <View
                  className={`h-6 w-6 rounded-md items-center justify-center border ${
                    vatInclusive ? 'bg-[#810021] border-[#810021]' : 'bg-white border-stone-400'
                  }`}
                >
                  {vatInclusive && <Check size={16} color="#F7F5F2" />}
                </View>
              </Pressable>
            </View>
          </View>

          <View className="flex-col md:flex-row items-start gap-4 pt-2">
            <View className="flex-1 w-full">
              <AdminNumberInput
                label="Cafe Mode Food SC Rate"
                mode="decimal"
                value={cafeFoodServiceChargeRate}
                onChangeText={setCafeFoodServiceChargeRate}
                placeholder="10.00"
                suffix="%"
                helperText="Applied only to Kitchen food during Cafe Mode (Coffee = 0%)"
              />
            </View>

            <View className="flex-1 w-full">
              <AdminNumberInput
                label="Event Mode All-Items SC Rate"
                mode="decimal"
                value={eventServiceChargeRate}
                onChangeText={setEventServiceChargeRate}
                placeholder="10.00"
                suffix="%"
                helperText="Applied to all items (Bar + Kitchen) during Event Night"
              />
            </View>
          </View>

          <View className="pt-2">
            <Pressable
              onPress={() => setServiceChargeEnabled(!serviceChargeEnabled)}
              className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border transition-all ${
                serviceChargeEnabled
                  ? 'bg-[#810021]/10 border-[#810021]'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              <View>
                <Text className="text-base font-bold text-stone-900">
                  Enable Dine-In Service Charge
                </Text>
                <Text className="text-sm text-stone-500">
                  Master toggle: when disabled, 0% service charge is collected across all modes
                </Text>
              </View>
              <View
                className={`h-6 w-6 rounded-md items-center justify-center border ${
                  serviceChargeEnabled
                    ? 'bg-[#810021] border-[#810021]'
                    : 'bg-white border-stone-400'
                }`}
              >
                {serviceChargeEnabled && <Check size={16} color="#F7F5F2" />}
              </View>
            </Pressable>
          </View>
        </View>

        {/* SECTION 2: ATTENDANCE & OVERTIME POLICY */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <View className="flex-row items-center gap-2 border-b border-stone-100 pb-2.5">
            <Clock size={18} color="#810021" />
            <Text className="text-base font-bold text-stone-900">
              Attendance &amp; Overtime Policy
            </Text>
          </View>

          <View className="flex-col md:flex-row gap-4">
            <View className="flex-1">
              <AdminNumberInput
                label="Standard Shift Hours"
                mode="decimal"
                value={standardShiftHours}
                onChangeText={setStandardShiftHours}
                placeholder="8.00"
                suffix="hrs"
                helperText="Hours before overtime applies"
              />
            </View>
            <View className="flex-1">
              <AdminNumberInput
                label="Overtime Grace Period"
                mode="decimal"
                value={overtimeGraceMinutes}
                onChangeText={setOvertimeGraceMinutes}
                placeholder="15"
                suffix="min"
                helperText="Buffer minutes before OT triggers"
              />
            </View>
          </View>

          <View className="pt-1">
            <Text className="mb-2 text-sm font-bold text-stone-700">Overtime Fee Calculation</Text>
            <View className="flex-row rounded-xl bg-stone-100 p-1">
              {(
                [
                  { key: 'MULTIPLIER', label: 'Hourly Multiplier (e.g. 1.25x)' },
                  { key: 'FLAT_HOURLY', label: 'Flat Hourly Fee (₱/hr)' },
                ] as const
              ).map((opt) => {
                const isSel = overtimeRateMode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setOvertimeRateMode(opt.key)}
                    className={`flex-1 min-h-[44px] items-center justify-center rounded-lg px-2 ${
                      isSel ? 'bg-white shadow-xs' : 'active:bg-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${isSel ? 'text-[#810021]' : 'text-stone-600'}`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-col md:flex-row gap-4 pt-1">
            {overtimeRateMode === 'MULTIPLIER' ? (
              <View className="flex-1">
                <AdminNumberInput
                  label="Overtime Multiplier"
                  mode="decimal"
                  value={overtimeMultiplier}
                  onChangeText={setOvertimeMultiplier}
                  placeholder="1.25"
                  suffix="x"
                  helperText={`On ₱645/day ÷ ${parseFloat(standardShiftHours) || 8}h = ₱${((645 / Math.max(parseFloat(standardShiftHours) || 8, 1)) * (parseFloat(overtimeMultiplier) || 1.25)).toFixed(2)}/hr OT`}
                />
              </View>
            ) : (
              <View className="flex-1">
                <AdminNumberInput
                  label="Flat Overtime Hourly Fee"
                  mode="currency"
                  value={overtimeFlatHourlyRate}
                  onChangeText={setOvertimeFlatHourlyRate}
                  placeholder="100.00"
                  helperText="Fixed ₱/hour paid for all overtime hours"
                />
              </View>
            )}
          </View>
        </View>

        {/* SECTION 2: DISCOUNTS & OPERATIONAL COMPS */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <View className="flex-row items-center gap-2 border-b border-stone-100 pb-2.5">
            <Receipt size={18} color="#810021" />
            <Text className="text-base font-bold text-stone-900">Discounts &amp; Comps</Text>
          </View>

          <View className="flex-col md:flex-row gap-4">
            <View className="flex-1">
              <AdminNumberInput
                label="Senior / PWD (RA 9994)"
                mode="integer"
                value={seniorPwdPercent}
                onChangeText={setSeniorPwdPercent}
                placeholder="20"
                suffix="%"
                helperText="Mandatory 20% + VAT exemption"
              />
            </View>

            <View className="flex-1">
              <AdminNumberInput
                label="Musician / Artist Comp"
                mode="integer"
                value={musicianCompPercent}
                onChangeText={setMusicianCompPercent}
                placeholder="100"
                suffix="%"
                helperText="100% comp for stage performers"
              />
            </View>

            <View className="flex-1">
              <AdminNumberInput
                label="Staff Meal Discount"
                mode="integer"
                value={staffDiscountPercent}
                onChangeText={setStaffDiscountPercent}
                placeholder="50"
                suffix="%"
                helperText="Duty meal allowance deduction"
              />
            </View>
          </View>
        </View>

        {/* SECTION 3: DIGITAL WALLET & QR PAYMENT METHODS */}
        <AdminQrPaymentManager />

        {/* SECTION 4: PRINTER & HARDWARE ROUTING */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <View className="flex-row items-center gap-2 border-b border-stone-100 pb-2.5">
            <Printer size={18} color="#810021" />
            <Text className="text-base font-bold text-stone-900">Printer Routing</Text>
          </View>

          {/* Dedicated Web Serial Station Tab Banner */}
          <View className="p-3.5 rounded-xl bg-[#EFECE6] border border-stone-200 flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-stone-900">
                Hardware Print &amp; Cash Drawer Station (?mode=printer)
              </Text>
              <Text className="text-xs text-stone-500 mt-0.5">
                Background terminal for USB thermal printer and RJ11 cash drawer kicks.
              </Text>
            </View>
            <Pressable
              onPress={() => window.open('?mode=printer', '_blank')}
              className="h-9 px-3 rounded-xl bg-[#810021] active:bg-[#600018] flex-row items-center"
            >
              <Printer size={14} color="#F7F5F2" />
              <Text className="ml-1.5 text-xs font-bold text-white">Open Station</Text>
              <ExternalLink size={12} color="#F7F5F2" className="ml-1" />
            </Pressable>
          </View>

          <View className="flex-col md:flex-row gap-4">
            <View className="flex-1">
              <AdminInput
                label="Bar Printer (Cocktails & Cafe)"
                value={barPrinterIp}
                onChangeText={setBarPrinterIp}
                placeholder="192.168.1.101"
                className="font-mono"
                helperText="Prints bar beverage chits"
              />
            </View>

            <View className="flex-1">
              <AdminInput
                label="Kitchen Food Printer"
                value={kitchenPrinterIp}
                onChangeText={setKitchenPrinterIp}
                placeholder="192.168.1.102"
                className="font-mono"
                helperText="Prints chef tickets & modifiers"
              />
            </View>

            <View className="flex-1">
              <AdminInput
                label="Runner Pass / Tray Printer"
                value={runnerPrinterIp}
                onChangeText={setRunnerPrinterIp}
                placeholder="192.168.1.103"
                className="font-mono"
                helperText="Consolidated order dispatch slip"
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
