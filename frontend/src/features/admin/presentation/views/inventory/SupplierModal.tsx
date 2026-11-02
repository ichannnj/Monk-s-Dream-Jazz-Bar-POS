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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setContactPerson(supplier.contact_person || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setLeadTimeDays(supplier.lead_time_days.toString());
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
      toast.error('Supplier company name is required', { title: 'Validation Error' });
      return;
    }

    const leadTime = parseInt(leadTimeDays, 10) || 1;

    setIsSubmitting(true);
    try {
      if (supplier) {
        await adminApi.updateSupplier(supplier.id, {
          name: name.trim(),
          contact_person: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          lead_time_days: leadTime,
          notes: notes.trim() || null,
        });
        toast.success(`Updated "${name}"`, { title: 'Supplier Saved' });
      } else {
        await adminApi.createSupplier({
          name: name.trim(),
          contact_person: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          lead_time_days: leadTime,
          notes: notes.trim() || null,
        });
        toast.success(`Created supplier "${name}"`, { title: 'Supplier Created' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save supplier', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <>
      <Pressable
        onPress={onClose}
        disabled={isSubmitting}
        className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-stone-200 active:bg-stone-300"
      >
        <Text className="text-base font-bold text-stone-700">Cancel</Text>
      </Pressable>
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
      >
        <Text className="text-base font-bold text-white">
          {isSubmitting ? 'Saving...' : supplier ? 'Save Changes' : 'Create Supplier'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={supplier ? 'Edit Vendor / Supplier' : 'New Vendor / Supplier'}
      subtitle="Manage contact records, purchase order lead times, and terms"
      icon={<Building2 size={22} color="#800020" />}
      size="md"
      footer={footer}
    >
      <View className="space-y-4">
        <AdminInput
          label="Company / Vendor Name"
          required
          value={name}
          onChangeText={setName}
          placeholder="e.g. Luzon Beverage & Spirits Imports"
        />

        <View className="flex-row space-x-4">
          <View className="flex-1">
            <AdminInput
              label="Contact Representative"
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="e.g. Marco Santos"
            />
          </View>
          <View className="w-44">
            <AdminNumberInput
              label="Lead Time (Days)"
              mode="integer"
              value={leadTimeDays}
              onChangeText={setLeadTimeDays}
              placeholder="2"
              suffix="days"
            />
          </View>
        </View>

        <View className="flex-row space-x-4">
          <View className="flex-1">
            <AdminInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+63 917 555 1234"
              keyboardType="phone-pad"
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="orders@supplier.ph"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <AdminInput
          label="Physical Address / Depot"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Taguig City, Metro Manila"
        />

        <AdminInput
          label="Notes & Terms"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          placeholder="e.g. Minimum order 5 cases. Net 15 invoice terms."
          className="min-h-[72px] py-2"
        />
      </View>
    </AdminModal>
  );
};
