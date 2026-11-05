import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Settings, Percent, Receipt, Printer, Check, Save, Building } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type VenueSettings } from '../../data/admin.api';
import { AdminInput } from '../components/AdminInput';
import { AdminNumberInput } from '../components/AdminNumberInput';
import { AdminQrPaymentManager } from '../components/AdminQrPaymentManager';

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
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);

  // Discounts & Comps State
  const [seniorPwdPercent, setSeniorPwdPercent] = useState('20');
  const [musicianCompPercent, setMusicianCompPercent] = useState('100');
  const [staffDiscountPercent, setStaffDiscountPercent] = useState('50');

  // Printer Hardware Routing
  const [barPrinterIp, setBarPrinterIp] = useState('192.168.1.101');
  const [kitchenPrinterIp, setKitchenPrinterIp] = useState('192.168.1.102');
  const [runnerPrinterIp, setRunnerPrinterIp] = useState('192.168.1.103');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const s = await adminApi.getVenueSettings();
        setSettings(s);
        setVenueName(s.venue_name || "Monk's Dream Jazz Bar");
        setDailyOverhead((s.daily_overhead_cost || 150).toString());
        setVatRate((s.vat_rate ?? 12).toString());
        setVatInclusive(s.vat_inclusive ?? true);
        setServiceChargeRate((s.service_charge_rate ?? 10).toString());
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
      } catch {
        toast.error('Failed to load venue configurations', { title: 'Load Error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await adminApi.updateVenueSettings({
        venue_name: venueName.trim(),
        daily_overhead_cost: parseFloat(dailyOverhead) || 150,
        vat_rate: parseFloat(vatRate) || 12,
        vat_inclusive: vatInclusive,
        service_charge_rate: parseFloat(serviceChargeRate) || 10,
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
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-6 flex-col sm:flex-row sm:items-center justify-between gap-4">
        <View className="flex-1 min-w-[260px]">
          <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Venue Settings, Taxes & Routing
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            VAT compliance, service charge distribution, comps/discounts, and hardware printer
            routing
          </Text>
        </View>

        <Pressable
          onPress={handleSaveAll}
          disabled={isSaving}
          className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-sm w-full sm:w-auto"
        >
          <Save size={20} color="#ffffff" />
          <Text className="ml-2 text-base font-bold text-white">
            {isSaving ? 'Saving Settings...' : 'Save All Settings'}
          </Text>
        </Pressable>
      </View>

      <View className="space-y-6">
        {/* SECTION 0: GENERAL VENUE IDENTITY */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Building size={22} color="#800020" />
            </View>
            <View className="ml-2">
              <Text className="text-xl font-bold text-stone-900">
                Venue Identity & Operating Float
              </Text>
              <Text className="text-base text-stone-500">
                Official business name and standard daily overheads
              </Text>
            </View>
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
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Percent size={22} color="#800020" />
            </View>
            <View className="ml-2">
              <Text className="text-xl font-bold text-stone-900">
                Taxes & Hospitality Service Charge
              </Text>
              <Text className="text-base text-stone-500">
                Philippine BIR VAT rate and front/back-of-house service gratuity pool
              </Text>
            </View>
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
                  vatInclusive ? 'bg-[#800020]/10 border-[#800020]' : 'bg-stone-50 border-stone-200'
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
                    vatInclusive ? 'bg-[#800020] border-[#800020]' : 'bg-white border-stone-400'
                  }`}
                >
                  {vatInclusive && <Check size={16} color="#ffffff" />}
                </View>
              </Pressable>
            </View>
          </View>

          <View className="flex-col md:flex-row items-start gap-4 pt-2">
            <View className="flex-1 w-full">
              <AdminNumberInput
                label="Service Charge Rate"
                mode="decimal"
                value={serviceChargeRate}
                onChangeText={setServiceChargeRate}
                placeholder="10.00"
                suffix="%"
                helperText="Hospitality staff share"
              />
            </View>

            <View className="flex-1 w-full md:pt-6">
              <Pressable
                onPress={() => setServiceChargeEnabled(!serviceChargeEnabled)}
                className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border transition-all ${
                  serviceChargeEnabled
                    ? 'bg-[#800020]/10 border-[#800020]'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <View>
                  <Text className="text-base font-bold text-stone-900">
                    Apply Service Charge to Dine-In Tabs
                  </Text>
                  <Text className="text-base text-stone-500">
                    Automatically added to floor table settlements
                  </Text>
                </View>
                <View
                  className={`h-6 w-6 rounded-md items-center justify-center border ${
                    serviceChargeEnabled
                      ? 'bg-[#800020] border-[#800020]'
                      : 'bg-white border-stone-400'
                  }`}
                >
                  {serviceChargeEnabled && <Check size={16} color="#ffffff" />}
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* SECTION 2: DISCOUNTS & OPERATIONAL COMPS */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Receipt size={22} color="#800020" />
            </View>
            <View className="ml-2">
              <Text className="text-xl font-bold text-stone-900">
                Discounts & Operational Comps
              </Text>
              <Text className="text-base text-stone-500">
                Statutory Senior/PWD exemptions, resident jazz artist comps, and staff meals
              </Text>
            </View>
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
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Printer size={22} color="#800020" />
            </View>
            <View className="ml-2">
              <Text className="text-xl font-bold text-stone-900">
                Hardware Thermal Printer Routing
              </Text>
              <Text className="text-base text-stone-500">
                IP and USB printer dispatch targets for Bar, Kitchen, and Runner Pass chits
              </Text>
            </View>
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
