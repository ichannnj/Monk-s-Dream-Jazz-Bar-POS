import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Percent, CheckCircle2, XCircle } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { ServiceChargeChoice } from './billSettlement.types';

interface BillServiceChargeSectionProps {
  serviceChargeChoice: ServiceChargeChoice;
  onSelectChoice: (choice: 'with' | 'without') => void;
  serviceChargeRate: number;
  previewServiceChargeAmount: number;
  isComp: boolean;
}

export const BillServiceChargeSection: React.FC<BillServiceChargeSectionProps> = ({
  serviceChargeChoice,
  onSelectChoice,
  serviceChargeRate,
  previewServiceChargeAmount,
  isComp,
}) => {
  const isRequiredUnselected = !isComp && serviceChargeChoice === null;

  return (
    <View
      style={{
        backgroundColor: '#F7F5F2',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: isRequiredUnselected ? '#810021' : '#E2DED6',
        marginBottom: 14,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Percent size={16} color="#810021" strokeWidth={2.4} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1617' }}>
            Service Charge (All F&amp;B Items)
          </Text>
        </View>

        {isComp ? (
          <View
            style={{
              backgroundColor: '#EFECE6',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#D6CFC7',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#57534E' }}>WAIVED (COMP)</Text>
          </View>
        ) : isRequiredUnselected ? (
          <View
            style={{
              backgroundColor: '#810021',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#F7F5F2' }}>REQUIRED</Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: serviceChargeChoice === 'with' ? '#810021' : '#EFECE6',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: serviceChargeChoice === 'with' ? '#F7F5F2' : '#1A1617',
              }}
            >
              {serviceChargeChoice === 'with'
                ? `+${formatCurrency(previewServiceChargeAmount)}`
                : '₱0.00'}
            </Text>
          </View>
        )}
      </View>

      {isComp ? (
        <Text style={{ fontSize: 13, color: '#706864', fontWeight: '600' }}>
          Service charge is automatically ₱0.00 for House Comp settlements.
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => onSelectChoice('without')}
              style={{
                flex: 1,
                minHeight: 54,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1.5,
                borderColor: serviceChargeChoice === 'without' ? '#810021' : '#D6CFC7',
                backgroundColor: serviceChargeChoice === 'without' ? '#810021' : '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: serviceChargeChoice === 'without' }}
              accessibilityLabel="No Service Charge (0%)"
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: serviceChargeChoice === 'without' ? '#F7F5F2' : '#1A1617',
                  }}
                >
                  No Service Charge
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: serviceChargeChoice === 'without' ? '#F7F5F2' : '#706864',
                    marginTop: 2,
                  }}
                >
                  0% · ₱0.00
                </Text>
              </View>
              <XCircle
                size={18}
                color={serviceChargeChoice === 'without' ? '#F7F5F2' : '#A8A29E'}
              />
            </Pressable>

            <Pressable
              onPress={() => onSelectChoice('with')}
              style={{
                flex: 1,
                minHeight: 54,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1.5,
                borderColor: serviceChargeChoice === 'with' ? '#810021' : '#D6CFC7',
                backgroundColor: serviceChargeChoice === 'with' ? '#810021' : '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: serviceChargeChoice === 'with' }}
              accessibilityLabel={`With Service Charge (${serviceChargeRate}%)`}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: serviceChargeChoice === 'with' ? '#F7F5F2' : '#1A1617',
                  }}
                >
                  With Service Charge
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: serviceChargeChoice === 'with' ? '#F7F5F2' : '#810021',
                    marginTop: 2,
                  }}
                >
                  {serviceChargeRate}% · +{formatCurrency(previewServiceChargeAmount)}
                </Text>
              </View>
              <CheckCircle2
                size={18}
                color={serviceChargeChoice === 'with' ? '#F7F5F2' : '#810021'}
              />
            </Pressable>
          </View>

          {previewServiceChargeAmount === 0 && (
            <Text style={{ fontSize: 12, color: '#706864', marginTop: 8 }}>
              No F&amp;B items eligible for Service Charge on this tab (Door Charge &amp; Corkage
              are excluded).
            </Text>
          )}
        </>
      )}
    </View>
  );
};
