import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import {
  Settings,
  Percent,
  Receipt,
  Printer,
  ShieldCheck,
  Check,
  Music,
  Save,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type VenueSettings } from '../../data/admin.api';

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
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
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
          className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-sm"
        >
          <Save size={20} color="#ffffff" />
          <Text className="ml-2 text-base font-bold text-white">
            {isSaving ? 'Saving Settings...' : 'Save All Settings'}
          </Text>
        </Pressable>
      </View>

      <View className="space-y-6">
        {/* SECTION 1: TAXES & SERVICE CHARGE */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Percent size={22} color="#800020" />
            </View>
            <View>
              <Text className="text-xl font-bold text-stone-900">
                Taxes & Hospitality Service Charge
              </Text>
              <Text className="text-base text-stone-500">
                Philippine BIR VAT rate and front/back-of-house service gratuity pool
              </Text>
            </View>
          </View>

          <View className="grid grid-cols-2 gap-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                VAT Percentage (%)
              </Text>
              <TextInput
                value={vatRate}
                onChangeText={setVatRate}
                keyboardType="numeric"
                placeholder="12.00"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
              />
            </View>

            <Pressable
              onPress={() => setVatInclusive(!vatInclusive)}
              className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border mt-6 ${
                vatInclusive ? 'bg-[#800020]/10 border-[#800020]' : 'bg-stone-50 border-stone-200'
              }`}
            >
              <View>
                <Text className="text-base font-bold text-stone-900">Prices are Tax-Inclusive</Text>
                <Text className="text-base text-stone-500">
                  Menu prices already include 12% VAT
                </Text>
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

          <View className="grid grid-cols-2 gap-4 pt-2">
            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Service Charge (%)
              </Text>
              <TextInput
                value={serviceChargeRate}
                onChangeText={setServiceChargeRate}
                keyboardType="numeric"
                placeholder="10.00"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
              />
            </View>

            <Pressable
              onPress={() => setServiceChargeEnabled(!serviceChargeEnabled)}
              className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-4 border mt-6 ${
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
                  Automatically added to table settlements
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

        {/* SECTION 2: DISCOUNTS & OPERATIONAL COMPS */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Receipt size={22} color="#800020" />
            </View>
            <View>
              <Text className="text-xl font-bold text-stone-900">
                Discounts & Operational Comps
              </Text>
              <Text className="text-base text-stone-500">
                Statutory Senior/PWD exemptions, resident jazz artist comps, and staff meals
              </Text>
            </View>
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Senior Citizen / PWD (RA 9994) %
              </Text>
              <TextInput
                value={seniorPwdPercent}
                onChangeText={setSeniorPwdPercent}
                keyboardType="numeric"
                placeholder="20"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
              />
              <Text className="text-base text-stone-500 mt-1">
                Mandatory 20% discount + VAT exemption
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Musician / Artist Comp %
              </Text>
              <TextInput
                value={musicianCompPercent}
                onChangeText={setMusicianCompPercent}
                keyboardType="numeric"
                placeholder="100"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
              />
              <Text className="text-base text-stone-500 mt-1">
                100% comp for live jazz stage performers
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Staff Meal Discount %
              </Text>
              <TextInput
                value={staffDiscountPercent}
                onChangeText={setStaffDiscountPercent}
                keyboardType="numeric"
                placeholder="50"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
              />
              <Text className="text-base text-stone-500 mt-1">
                Duty meal deduction for active staff
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: PRINTER & HARDWARE ROUTING */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <View className="flex-row items-center space-x-3 border-b border-stone-100 pb-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
              <Printer size={22} color="#800020" />
            </View>
            <View>
              <Text className="text-xl font-bold text-stone-900">
                Hardware Thermal Printer Routing
              </Text>
              <Text className="text-base text-stone-500">
                IP and USB printer dispatch targets for Bar, Kitchen, and Runner Pass chits
              </Text>
            </View>
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Bar Printer (Cocktails & Cafe)
              </Text>
              <TextInput
                value={barPrinterIp}
                onChangeText={setBarPrinterIp}
                placeholder="192.168.1.101"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-mono"
              />
              <Text className="text-base text-stone-500 mt-1">Prints bar dispatch chits</Text>
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Kitchen Food Printer
              </Text>
              <TextInput
                value={kitchenPrinterIp}
                onChangeText={setKitchenPrinterIp}
                placeholder="192.168.1.102"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-mono"
              />
              <Text className="text-base text-stone-500 mt-1">Prints chef tickets & modifiers</Text>
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Runner Pass / Tray Printer
              </Text>
              <TextInput
                value={runnerPrinterIp}
                onChangeText={setRunnerPrinterIp}
                placeholder="192.168.1.103"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-mono"
              />
              <Text className="text-base text-stone-500 mt-1">
                Consolidated order dispatch slip
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
