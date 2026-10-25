import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, Switch } from 'react-native';
import { X, ShoppingBag, ArrowRight } from 'lucide-react-native';

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

  const handleProceed = () => {
    const finalName = customerName.trim() || 'Walk-In Guest';
    onProceedToOrder(finalName, isPrepaid, notes);
    setCustomerName('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.badge}>
                <ShoppingBag size={15} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.title}>New Walk-In Takeout Order</Text>
                <Text style={styles.ticketSub}>
                  Assigned Ticket: <Text style={styles.ticketHighlight}>#{nextTicketNumber}</Text>
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close takeout modal"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Customer Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sarah, David, Alex..."
              placeholderTextColor="#9ca3af"
              value={customerName}
              onChangeText={setCustomerName}
              autoFocus
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Packaging & Takeout Notes:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Disposable to-go cups, separate paper bag, utensils..."
              placeholderTextColor="#9ca3af"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Prepaid Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Prepaid at Counter</Text>
              <Text style={styles.toggleSub}>
                Customer pays immediately before preparation starts
              </Text>
            </View>
            <Switch
              value={isPrepaid}
              onValueChange={setIsPrepaid}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={isPrepaid ? '#15803d' : '#f4f3f4'}
            />
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable onPress={handleProceed} style={styles.proceedBtn}>
              <Text style={styles.proceedBtnText}>Select Menu Items</Text>
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
    maxWidth: 500,
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
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  ticketSub: {
    fontSize: 13.5,
    color: '#6b7280',
    marginTop: 2,
  },
  ticketHighlight: {
    color: '#15803d',
    fontWeight: '800',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 70,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 14,
    marginBottom: 22,
    minHeight: 52,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  toggleSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4b5563',
  },
  proceedBtn: {
    flex: 2,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#15803d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
