import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Building2, Phone, Mail, Clock, MapPin, Edit, Trash2 } from 'lucide-react-native';
import { SupplierAdmin } from '../../../../data/admin.api';

interface InventorySuppliersSectionProps {
  suppliers: SupplierAdmin[];
  onEditSupplier: (sup: SupplierAdmin) => void;
  onDeleteSupplier: (sup: SupplierAdmin) => void;
}

export const InventorySuppliersSection: React.FC<InventorySuppliersSectionProps> = ({
  suppliers,
  onEditSupplier,
  onDeleteSupplier,
}) => {
  return (
    <View className="space-y-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-lg font-bold text-stone-900">
          Active Vendor Accounts ({suppliers.length})
        </Text>
      </View>

      {suppliers.length === 0 ? (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-12 items-center justify-center">
          <Building2 size={44} color="#a8a29e" />
          <Text className="mt-3 text-base font-bold text-stone-700">
            No suppliers registered in directory.
          </Text>
          <Text className="text-xs text-stone-400 mt-1">
            Add suppliers to link purchase orders and delivery restocks.
          </Text>
        </View>
      ) : (
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <View
              key={sup.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex-col justify-between"
            >
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 rounded-xl bg-[#800020]/10 items-center justify-center">
                      <Building2 size={18} color="#800020" />
                    </View>
                    <Text className="text-base font-bold text-stone-900">{sup.name}</Text>
                  </View>
                  <View className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-emerald-800">Active Vendor</Text>
                  </View>
                </View>

                <View className="space-y-1.5 mt-2">
                  {sup.contact_person && (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-stone-500">Contact:</Text>
                      <Text className="text-xs font-semibold text-stone-800">
                        {sup.contact_person}
                      </Text>
                    </View>
                  )}

                  {sup.phone && (
                    <View className="flex-row items-center gap-2">
                      <Phone size={13} color="#78716c" />
                      <Text className="text-xs font-mono text-stone-700">{sup.phone}</Text>
                    </View>
                  )}

                  {sup.email && (
                    <View className="flex-row items-center gap-2">
                      <Mail size={13} color="#78716c" />
                      <Text className="text-xs text-stone-700">{sup.email}</Text>
                    </View>
                  )}

                  {sup.lead_time_days !== undefined && (
                    <View className="flex-row items-center gap-2 mt-1">
                      <Clock size={13} color="#78716c" />
                      <Text className="text-xs text-stone-600">
                        Delivery Lead Time:{' '}
                        <Text className="font-bold text-stone-900">{sup.lead_time_days} Days</Text>
                      </Text>
                    </View>
                  )}

                  {sup.address && (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={13} color="#78716c" />
                      <Text className="text-xs text-stone-500 truncate">{sup.address}</Text>
                    </View>
                  )}
                </View>

                {sup.notes && (
                  <View className="mt-3 rounded-lg bg-stone-50 p-2.5 border border-stone-200/60">
                    <Text className="text-xs italic text-stone-600">"{sup.notes}"</Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center justify-end gap-2 pt-3 mt-4 border-t border-stone-100">
                <Pressable
                  onPress={() => onEditSupplier(sup)}
                  className="h-9 px-3 rounded-lg bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                >
                  <Edit size={14} color="#44403c" />
                  <Text className="ml-1 text-xs font-bold text-stone-700">Edit</Text>
                </Pressable>

                <Pressable
                  onPress={() => onDeleteSupplier(sup)}
                  className="h-9 px-3 rounded-lg bg-rose-50 border border-rose-200 flex-row items-center active:bg-rose-100"
                >
                  <Trash2 size={14} color="#e11d48" />
                  <Text className="ml-1 text-xs font-bold text-rose-700">Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
