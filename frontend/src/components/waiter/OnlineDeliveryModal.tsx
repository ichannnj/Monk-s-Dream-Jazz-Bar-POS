import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { X, Bike, ArrowRight, CheckCircle2 } from 'lucide-react-native';

interface OnlineDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  onProceedToOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformRef: string,
    riderName: string,
    customerName: string
  ) => void;
}

export const OnlineDeliveryModal: React.FC<OnlineDeliveryModalProps> = ({
  visible,
  onClose,
  onProceedToOrder,
}) => {
  const [platform, setPlatform] = useState<'grabfood' | 'foodpanda'>('grabfood');
  const [platformRef, setPlatformRef] = useState('');
  const [riderName, setRiderName] = useState('');
  const [customerName, setCustomerName] = useState('');

  const handleProceed = () => {
    const finalRef =
      platformRef.trim() ||
      `${platform === 'grabfood' ? 'GF' : 'FP'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalRider = riderName.trim() || 'Rider Assigned';
    const finalCust = customerName.trim() || 'Online Customer';

    onProceedToOrder(platform, finalRef, finalRider, finalCust);
    setPlatformRef('');
    setRiderName('');
    setCustomerName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.badge,
                  platform === 'grabfood' ? styles.badgeGrab : styles.badgePanda,
                ]}
              >
                <Bike size={16} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.title}>Manual Online Delivery Intake</Text>
                <Text style={styles.subtitle}>
                  Key in orders from merchant tablet (GrabFood / Foodpanda)
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Platform Toggle */}
          <Text style={styles.label}>Select Delivery Platform:</Text>
          <View style={styles.platformRow}>
            <Pressable
              onPress={() => setPlatform('grabfood')}
              style={[
                styles.platformOption,
                platform === 'grabfood' && styles.platformOptionGrab,
              ]}
            >
              <Text
                style={[
                  styles.platformOptionText,
                  platform === 'grabfood' && styles.platformOptionTextActive,
                ]}
              >
                🟢 GrabFood
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPlatform('foodpanda')}
              style={[
                styles.platformOption,
                platform === 'foodpanda' && styles.platformOptionPanda,
              ]}
            >
              <Text
                style={[
                  styles.platformOptionText,
                  platform === 'foodpanda' && styles.platformOptionTextActive,
                ]}
              >
                🐼 Foodpanda
              </Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Platform Order # (from tablet):</Text>
            <TextInput
              style={styles.input}
              placeholder={platform === 'grabfood' ? 'e.g. GF-8842' : 'e.g. FP-3012'}
              placeholderTextColor="#9ca3af"
              value={platformRef}
              onChangeText={setPlatformRef}
              autoCapitalize="characters"
              autoFocus
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Rider Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mike (GrabBike)"
                placeholderTextColor="#9ca3af"
                value={riderName}
                onChangeText={setRiderName}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Customer Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Kevin Zhao"
                placeholderTextColor="#9ca3af"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
          </View>

          {/* Auto Settlement Banner */}
          <View style={styles.prepaidBanner}>
            <CheckCircle2 size={16} color="#059669" />
            <Text style={styles.prepaidBannerText}>
              Prepaid via {platform === 'grabfood' ? 'GrabPay' : 'Foodpanda in-app'}. No
              counter payment required.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleProceed}
              style={[
                styles.proceedBtn,
                platform === 'grabfood' ? styles.proceedGrab : styles.proceedPanda,
              ]}
            >
              <Text style={styles.proceedBtnText}>Key In Ordered Items</Text>
              <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 540,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGrab: {
    backgroundColor: '#059669',
  },
  badgePanda: {
    backgroundColor: '#db2777',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  platformOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  platformOptionGrab: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  platformOptionPanda: {
    backgroundColor: '#fdf2f8',
    borderColor: '#db2777',
  },
  platformOptionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4b5563',
  },
  platformOptionTextActive: {
    color: '#111827',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  prepaidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 22,
  },
  prepaidBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  proceedBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedGrab: {
    backgroundColor: '#059669',
  },
  proceedPanda: {
    backgroundColor: '#db2777',
  },
  proceedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
