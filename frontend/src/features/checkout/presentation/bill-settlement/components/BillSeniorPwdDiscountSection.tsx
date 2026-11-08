import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { DiscountType } from '../../../utils/taxAndDiscountCalculator';
import { styles } from '../BillSettlementModal.styles';

interface BillSeniorPwdDiscountSectionProps {
  discountType: DiscountType;
  setDiscountType: (type: DiscountType) => void;
  totalDiscountAmount: number;
  seniorPwdId: string;
  setSeniorPwdId: (id: string) => void;
  seniorPwdName: string;
  setSeniorPwdName: (name: string) => void;
  seniorItemSelectionMode: 'all' | 'select';
  setSeniorItemSelectionMode: (mode: 'all' | 'select') => void;
  selectedSeniorItemIds: Set<string>;
  setSelectedSeniorItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  customDiscountValue: string;
  setCustomDiscountValue: (val: string) => void;
  customDiscountMode: 'percent' | 'fixed';
  setCustomDiscountMode: (mode: 'percent' | 'fixed') => void;
  rawItems: any[];
}

export const BillSeniorPwdDiscountSection: React.FC<BillSeniorPwdDiscountSectionProps> = ({
  discountType,
  setDiscountType,
  totalDiscountAmount,
  seniorPwdId,
  setSeniorPwdId,
  seniorPwdName,
  setSeniorPwdName,
  seniorItemSelectionMode,
  setSeniorItemSelectionMode,
  selectedSeniorItemIds,
  setSelectedSeniorItemIds,
  customDiscountValue,
  setCustomDiscountValue,
  customDiscountMode,
  setCustomDiscountMode,
  rawItems,
}) => {
  return (
    <View style={styles.discountContainer}>
      <View style={styles.discountTitleRow}>
        <Text style={styles.discountTitle}>Discounts & Privileges</Text>
        {totalDiscountAmount > 0 ? (
          <View className="bg-rose-100 px-2 py-0.5 rounded-full">
            <Text className="text-xs font-black text-rose-700">
              -{formatCurrency(totalDiscountAmount)} OFF
            </Text>
          </View>
        ) : null}
      </View>

      {/* Discount Type Pills */}
      <View style={styles.discountPillRow}>
        <Pressable
          onPress={() => setDiscountType('NONE')}
          style={[styles.discountPill, discountType === 'NONE' && styles.discountPillActive]}
        >
          <Text
            style={[
              styles.discountPillText,
              discountType === 'NONE' && styles.discountPillTextActive,
            ]}
          >
            No Discount
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDiscountType('SENIOR_CITIZEN')}
          style={[
            styles.discountPill,
            discountType === 'SENIOR_CITIZEN' && styles.discountPillActive,
          ]}
        >
          <Text
            style={[
              styles.discountPillText,
              discountType === 'SENIOR_CITIZEN' && styles.discountPillTextActive,
            ]}
          >
            Senior Citizen (20%)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDiscountType('PWD')}
          style={[styles.discountPill, discountType === 'PWD' && styles.discountPillActive]}
        >
          <Text
            style={[
              styles.discountPillText,
              discountType === 'PWD' && styles.discountPillTextActive,
            ]}
          >
            PWD (20%)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDiscountType('PROMO')}
          style={[styles.discountPill, discountType === 'PROMO' && styles.discountPillActive]}
        >
          <Text
            style={[
              styles.discountPillText,
              discountType === 'PROMO' && styles.discountPillTextActive,
            ]}
          >
            Custom / Promo
          </Text>
        </Pressable>
      </View>

      {/* Senior Citizen / PWD Statutory Fields (BIR RR 7-2010) */}
      {(discountType === 'SENIOR_CITIZEN' || discountType === 'PWD') && (
        <View style={styles.seniorFieldsBox}>
          <View className="flex-row items-center gap-1.5 mb-1">
            <ShieldCheck size={16} color="#c2410c" />
            <Text style={styles.seniorInputLabel}>
              {discountType === 'SENIOR_CITIZEN'
                ? 'Senior Citizen OSCA Details'
                : 'PWD Beneficiary Details'}{' '}
              (Mandatory)
            </Text>
          </View>

          <View className="flex-col sm:flex-row gap-2">
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-600 mb-1">
                {discountType === 'SENIOR_CITIZEN' ? 'OSCA ID Number *' : 'PWD ID Number *'}
              </Text>
              <TextInput
                value={seniorPwdId}
                onChangeText={setSeniorPwdId}
                placeholder="e.g. 12-3456-7890"
                placeholderTextColor="#9ca3af"
                style={styles.seniorInput}
              />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-600 mb-1">
                Cardholder Full Name *
              </Text>
              <TextInput
                value={seniorPwdName}
                onChangeText={setSeniorPwdName}
                placeholder="e.g. Maria Santos"
                placeholderTextColor="#9ca3af"
                style={styles.seniorInput}
              />
            </View>
          </View>

          {/* Scope Selector: All Items on this Tab vs Select Senior Items */}
          {rawItems.length > 1 && (
            <View className="mt-2 pt-2 border-t border-orange-200">
              <Text className="text-[11px] font-extrabold text-gray-700 uppercase mb-1.5">
                Items Entitled to 20% Discount &amp; VAT Exemption:
              </Text>
              <View className="flex-row gap-2 mb-2">
                <Pressable
                  onPress={() => setSeniorItemSelectionMode('all')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg border items-center ${
                    seniorItemSelectionMode === 'all'
                      ? 'bg-amber-900 border-amber-900'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      seniorItemSelectionMode === 'all' ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    All Items on Tab
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSeniorItemSelectionMode('select')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg border items-center ${
                    seniorItemSelectionMode === 'select'
                      ? 'bg-amber-900 border-amber-900'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      seniorItemSelectionMode === 'select' ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    Select Specific Items ({selectedSeniorItemIds.size})
                  </Text>
                </Pressable>
              </View>

              {/* Interactive Checklist if 'select' mode */}
              {seniorItemSelectionMode === 'select' && (
                <View className="gap-1.5 max-h-40">
                  {rawItems.map((item) => {
                    const isSelected = selectedSeniorItemIds.has(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          const next = new Set(selectedSeniorItemIds);
                          if (isSelected) next.delete(item.id);
                          else next.add(item.id);
                          setSelectedSeniorItemIds(next);
                        }}
                        style={[styles.seniorItemRow, isSelected && styles.seniorItemRowActive]}
                      >
                        <View className="flex-row items-center gap-2 flex-1 mr-2">
                          <View
                            className={`w-4 h-4 rounded border items-center justify-center ${
                              isSelected
                                ? 'bg-orange-600 border-orange-600'
                                : 'border-gray-400 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 size={12} color="#ffffff" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>
                              {item.quantity}x {item.productName}
                            </Text>
                            {item.modifiers && item.modifiers.length > 0 ? (
                              <Text className="text-[10px] text-wine-900 font-semibold mt-0.5">
                                + {item.modifiers.join(', ')}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <Text className="text-xs font-black text-gray-700">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Custom Promo Discount Input */}
      {discountType === 'PROMO' && (
        <View className="bg-white rounded-xl p-3 border border-purple-200 gap-2.5">
          <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Custom / Promo Discount Value
          </Text>

          {/* Segmented Mode Selector */}
          <View className="flex-row rounded-lg bg-gray-100 p-1 gap-1">
            <Pressable
              onPress={() => setCustomDiscountMode('percent')}
              className={`flex-1 py-2 rounded-md items-center justify-center ${
                customDiscountMode === 'percent' ? 'bg-[#641b2a] shadow-sm' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  customDiscountMode === 'percent' ? 'text-white' : 'text-gray-600'
                }`}
              >
                Percentage (%)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCustomDiscountMode('fixed')}
              className={`flex-1 py-2 rounded-md items-center justify-center ${
                customDiscountMode === 'fixed' ? 'bg-[#641b2a] shadow-sm' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  customDiscountMode === 'fixed' ? 'text-white' : 'text-gray-600'
                }`}
              >
                Fixed Amount (₱)
              </Text>
            </Pressable>
          </View>

          {/* Full-width Numeric Input */}
          <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-1">
            <Text className="text-base font-extrabold text-gray-500 mr-2">
              {customDiscountMode === 'percent' ? '%' : '₱'}
            </Text>
            <TextInput
              value={customDiscountValue}
              onChangeText={setCustomDiscountValue}
              placeholder={
                customDiscountMode === 'percent'
                  ? 'Enter discount % (e.g. 10)'
                  : 'Enter peso discount (e.g. 100)'
              }
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className="flex-1 text-base font-bold text-gray-900 py-1.5"
            />
          </View>
        </View>
      )}
    </View>
  );
};
