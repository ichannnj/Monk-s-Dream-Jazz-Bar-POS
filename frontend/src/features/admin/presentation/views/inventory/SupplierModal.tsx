import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type SupplierAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

interface SupplierModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: SupplierAdmin | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  visible,
  onClose,
  onSuccess,
  supplier,
}) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setErrorMsg(null);
    if (supplier) {
      setName(supplier.name);
      setContactPerson(supplier.contact_person || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setLeadTimeDays(String(supplier.lead_time_days ?? 1));
      setNotes(supplier.notes || '');
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setLeadTimeDays('2');
      setNotes('');
    }
  }, [supplier, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg('Supplier company name is required.');
      return;
    }

    const leadTime = parseInt(leadTimeDays, 10);
    if (!Number.isFinite(leadTime) || leadTime < 0) {
      setErrorMsg('Lead time must be 0 or more days.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Enter a valid email address.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        lead_time_days: leadTime,
        notes: notes.trim() || null,
      };

      if (supplier) {
        await adminApi.updateSupplier(supplier.id, payload);
        toast.success(`Updated "${name.trim()}"`, { title: 'Supplier Saved' });
      } else {
        await adminApi.createSupplier(payload);
        toast.success(`Created supplier "${name.trim()}"`, { title: 'Supplier Created' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <View className="flex-row items-center justify-end gap-2.5 w-full">
      <Pressable
        onPress={onClose}
        disabled={isSubmitting}
        className="min-h-[48px] px-5 items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
      >
        <Text className="text-base font-bold text-[#1C1917]">Cancel</Text>
      </Pressable>
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="min-h-[48px] flex-1 sm:flex-initial px-6 items-center justify-center rounded-xl bg-[#810021] active:opacity-85"
      >
        <Text className="text-base font-bold text-white">
          {isSubmitting ? 'Saving...' : supplier ? 'Save Changes' : 'Create Supplier'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={supplier ? 'Edit Supplier' : 'New Supplier'}
      subtitle="Vendor contact details and delivery lead time"
      icon={<Building2 size={20} color="#810021" />}
      size="md"
      footer={footer}
    >
      <View className="gap-4">
        <AdminInput
          label="Company / Vendor Name"
          required
          value={name}
          onChangeText={(v) => {
            setErrorMsg(null);
            setName(v);
          }}
          placeholder="e.g. Luzon Beverage & Spirits"
          clearable
        />

        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminInput
              label="Contact Person"
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="e.g. Marco Santos"
              clearable
            />
          </View>
          <View className="w-full sm:w-44">
            <AdminNumberInput
              label="Lead Time"
              mode="integer"
              allowNegative={false}
              value={leadTimeDays}
              onChangeText={setLeadTimeDays}
              placeholder="2"
              suffix="days"
            />
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+63 917 555 1234"
              keyboardType="phone-pad"
              clearable
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Email Address"
              value={email}
              onChangeText={(v) => {
                setErrorMsg(null);
                setEmail(v);
              }}
              placeholder="orders@supplier.ph"
              keyboardType="email-address"
              autoCapitalize="none"
              clearable
            />
          </View>
        </View>

        <AdminInput
          label="Depot / Address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Taguig City, Metro Manila"
          clearable
        />

        <AdminInput
          label="Notes & Terms"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          placeholder="e.g. Minimum order 5 cases, Net 15 terms"
          className="min-h-[72px] py-2"
        />

        {errorMsg && (
          <View className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
            <Text className="text-base font-semibold text-[#b32638]">{errorMsg}</Text>
          </View>
        )}
      </View>
    </AdminModal>
  );
};
