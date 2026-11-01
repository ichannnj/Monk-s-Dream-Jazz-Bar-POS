import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { X, Building2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type SupplierAdmin } from '../../../data/admin.api';

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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-xl max-h-[90%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
                <Building2 size={22} color="#800020" />
              </View>
              <Text className="text-xl font-bold text-stone-900">
                {supplier ? 'Edit Vendor / Supplier' : 'New Vendor / Supplier'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView className="p-6 space-y-4" showsVerticalScrollIndicator={false}>
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">Company Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Luzon Beverage & Spirits Imports"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
              />
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-stone-800 mb-1">
                  Contact Representative
                </Text>
                <TextInput
                  value={contactPerson}
                  onChangeText={setContactPerson}
                  placeholder="e.g. Marco Santos"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
                />
              </View>
              <View className="w-40">
                <Text className="text-base font-semibold text-stone-800 mb-1">
                  Lead Time (Days)
                </Text>
                <TextInput
                  value={leadTimeDays}
                  onChangeText={setLeadTimeDays}
                  keyboardType="numeric"
                  placeholder="2"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
                />
              </View>
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-stone-800 mb-1">Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+63 917 555 1234"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-stone-800 mb-1">Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="orders@supplier.ph"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
                />
              </View>
            </View>

            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Physical Address / Depot
              </Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Taguig City, Metro Manila"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">Notes / Terms</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                placeholder="e.g. Minimum order 5 cases. Net 15 invoice terms."
                className="min-h-[72px] rounded-xl border border-stone-300 p-3 text-base text-stone-900"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center justify-end space-x-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
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
          </View>
        </View>
      </View>
    </Modal>
  );
};
