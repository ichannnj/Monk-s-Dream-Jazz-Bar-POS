import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { X, Bike, ArrowRight } from 'lucide-react-native';
import { useVirtualKeyboard } from '../../shared';

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
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

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
      <View
        style={[
          styles.backdrop,
          isKeyboardOpen && {
            justifyContent: 'flex-start',
            paddingTop: 16,
            paddingBottom: Math.min(keyboardHeight, 320) + 16,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
        />
        <View
          style={[
            styles.modalCard,
            isKeyboardOpen && {
              maxHeight: Math.max(260, viewportHeight - 24),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.badge}>
                <Bike size={16} color="#F5F5F5" strokeWidth={2.4} />
              </View>
              <Text style={styles.title}>Delivery Intake</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close online delivery intake"
            >
              <X size={20} color="#1c1917" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {/* Platform Toggle */}
            <Text style={styles.label}>Platform:</Text>
            <View style={styles.platformRow}>
              <Pressable
                onPress={() => setPlatform('grabfood')}
                style={[
                  styles.platformOption,
                  platform === 'grabfood' && styles.platformOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.platformOptionText,
                    platform === 'grabfood' && styles.platformOptionTextActive,
                  ]}
                >
                  GrabFood
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPlatform('foodpanda')}
                style={[
                  styles.platformOption,
                  platform === 'foodpanda' && styles.platformOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.platformOptionText,
                    platform === 'foodpanda' && styles.platformOptionTextActive,
                  ]}
                >
                  Foodpanda
                </Text>
              </Pressable>
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Order #:</Text>
              <TextInput
                style={styles.input}
                placeholder={platform === 'grabfood' ? 'GF-0000' : 'FP-0000'}
                placeholderTextColor="#a8a29e"
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
                  placeholder="Rider Name (Optional)"
                  placeholderTextColor="#a8a29e"
                  value={riderName}
                  onChangeText={setRiderName}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Customer Name:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Customer Name (Optional)"
                  placeholderTextColor="#a8a29e"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable onPress={handleProceed} style={styles.proceedBtn}>
              <Text style={styles.proceedBtnText}>Start Order</Text>
              <ArrowRight size={16} color="#F5F5F5" strokeWidth={2.4} />
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
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    width: '100%',
    maxWidth: 540,
    maxHeight: '96%',
    padding: 18,
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
    backgroundColor: '#810021',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1917',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 8,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  platformOption: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  platformOptionActive: {
    backgroundColor: '#810021',
    borderColor: '#810021',
  },
  platformOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#44403c',
  },
  platformOptionTextActive: {
    color: '#F5F5F5',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 16,
    color: '#1C1917',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#44403c',
  },
  proceedBtn: {
    flex: 2,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#810021',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  proceedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F5F5F5',
  },
});
