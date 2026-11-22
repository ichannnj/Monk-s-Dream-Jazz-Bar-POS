import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
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
    <View className="gap-4">
      <Text className="text-lg font-bold text-[#1A1617]">
        Active Suppliers ({suppliers.length})
      </Text>

      {suppliers.length === 0 ? (
        <View className="rounded-2xl border border-[#E2DED6] bg-white p-12 items-center justify-center">
          <Building2 size={40} color="#78716C" />
          <Text className="mt-3 text-lg font-bold text-[#1A1617] text-center">
            No suppliers registered yet.
          </Text>
          <Text className="text-base text-[#78716C] mt-1 text-center">
            Add vendors to link restock deliveries and contact numbers.
          </Text>
        </View>
      ) : (
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <View
              key={sup.id}
              className="rounded-2xl border border-[#E2DED6] bg-white p-5 flex-col justify-between gap-4"
            >
              <View className="gap-2.5">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 rounded-xl bg-[#EFECE6] border border-[#E2DED6] items-center justify-center shrink-0">
                    <Building2 size={20} color="#810021" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-lg font-bold text-[#1A1617]" numberOfLines={1}>
                      {sup.name}
                    </Text>
                    {sup.contact_person ? (
                      <Text className="text-base text-[#78716C]" numberOfLines={1}>
                        {sup.contact_person}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="gap-2 pt-1">
                  {sup.phone ? (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${sup.phone}`)}
                      className="flex-row items-center gap-2 active:opacity-75"
                    >
                      <Phone size={16} color="#810021" />
                      <Text className="text-base font-semibold text-[#810021] tabular-nums">
                        {sup.phone}
                      </Text>
                    </Pressable>
                  ) : null}

                  {sup.email ? (
                    <View className="flex-row items-center gap-2">
                      <Mail size={16} color="#78716C" />
                      <Text className="text-base text-[#1A1617] flex-1" numberOfLines={1}>
                        {sup.email}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center gap-2">
                    <Clock size={16} color="#78716C" />
                    <Text className="text-base text-[#78716C] tabular-nums">
                      Lead time:{' '}
                      <Text className="font-bold text-[#1A1617]">{sup.lead_time_days}d</Text>
                    </Text>
                  </View>

                  {sup.address ? (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={16} color="#78716C" />
                      <Text className="text-base text-[#78716C] flex-1" numberOfLines={1}>
                        {sup.address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {sup.notes ? (
                  <View className="rounded-xl bg-[#EFECE6] p-3 border border-[#E2DED6]">
                    <Text className="text-base text-[#1A1617]">{sup.notes}</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center justify-end gap-2 pt-3 border-t border-[#E2DED6]">
                <Pressable
                  onPress={() => onEditSupplier(sup)}
                  className="min-h-[48px] px-4 rounded-xl bg-white border border-[#E2DED6] flex-row items-center active:opacity-80"
                >
                  <Edit size={16} color="#1A1617" />
                  <Text className="ml-1.5 text-base font-bold text-[#1A1617]">Edit</Text>
                </Pressable>

                <Pressable
                  onPress={() => onDeleteSupplier(sup)}
                  className="min-h-[48px] px-4 rounded-xl bg-white border border-[#E2DED6] flex-row items-center active:opacity-80"
                >
                  <Trash2 size={16} color="#b32638" />
                  <Text className="ml-1.5 text-base font-bold text-[#b32638]">Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
