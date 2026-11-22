import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { X, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { useVirtualKeyboard } from '../../shared';

interface NewTakeoutModalProps {
  visible: boolean;
  nextTicketNumber: string;
  onClose: () => void;
  onProceedToOrder: (customerName: string, isPrepaid: boolean, notes: string) => void;
}

export const NewTakeoutModal: React.FC<NewTakeoutModalProps> = ({
  visible,
  nextTicketNumber,
  onClose,
  onProceedToOrder,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [isPrepaid, setIsPrepaid] = useState(true);
  const [notes, setNotes] = useState('');
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

  const handleProceed = () => {
    const finalName = customerName.trim() || 'Walk-In Guest';
    onProceedToOrder(finalName, isPrepaid, notes);
    setCustomerName('');
    setNotes('');
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
                <ShoppingBag size={16} color="#F5F5F5" strokeWidth={2.4} />
              </View>
              <Text style={styles.title}>Takeout · #{nextTicketNumber}</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close takeout modal"
            >
              <X size={20} color="#1c1917" />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>Customer Name:</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  style={[styles.input, customerName.length > 0 && { paddingRight: 40 }]}
                  placeholder="Customer Name (Optional)"
                  placeholderTextColor="#a8a29e"
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoFocus
                />
                {customerName.length > 0 && (
                  <Pressable
                    onPress={() => setCustomerName('')}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      right: 12,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#e7e5e4',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear name"
                  >
                    <X size={14} color="#44403c" />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text style={styles.label}>Notes:</Text>
                {notes.length > 0 && (
                  <Pressable
                    onPress={() => setNotes('')}
                    hitSlop={8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FAF8F5',
                      borderWidth: 1,
                      borderColor: '#e7e5e4',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear notes"
                  >
                    <X size={12} color="#78716C" />
                    <Text
                      style={{ marginLeft: 4, fontSize: 11, fontWeight: '700', color: '#44403c' }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Packaging, utensils, etc..."
                placeholderTextColor="#a8a29e"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Prepaid Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleTitle}>Prepaid at Counter</Text>
              <Switch
                value={isPrepaid}
                onValueChange={setIsPrepaid}
                trackColor={{ false: '#e7e5e4', true: '#810021' }}
                thumbColor={isPrepaid ? '#F5F5F5' : '#F5F5F5'}
              />
            </View>
          </ScrollView>

          {/* Buttons */}
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
    maxWidth: 500,
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 8,
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
  textArea: {
    minHeight: 70,
    fontSize: 16, // Invariant: Must be >= 16px to prevent iOS Safari auto-zoom
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14,
    borderRadius: 14,
    marginBottom: 22,
    minHeight: 52,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
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
    gap: 8,
  },
  proceedBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F5F5F5',
  },
});
