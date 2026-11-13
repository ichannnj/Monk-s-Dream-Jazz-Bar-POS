import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';
import { X, Trash2, Check, Ticket } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';

interface DoorChargeEditorModalProps {
  visible: boolean;
  onClose: () => void;
  tabId: string;
  tableName: string;
  currentPax: number;
  currentPrice: number;
  onSave: (pax: number, price: number) => Promise<void>;
  onVoid: () => Promise<void>;
}

export const DoorChargeEditorModal: React.FC<DoorChargeEditorModalProps> = ({
  visible,
  onClose,
  tabId,
  tableName,
  currentPax,
  currentPrice,
  onSave,
  onVoid,
}) => {
  const [pax, setPax] = useState<number>(currentPax || 1);
  const [priceText, setPriceText] = useState<string>(String(currentPrice || 300));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setPax(currentPax || 1);
      setPriceText(String(currentPrice || 300));
      setIsSubmitting(false);
    }
  }, [visible, currentPax, currentPrice]);

  if (!visible) return null;

  const numericPrice = parseFloat(priceText) || 0;
  const totalAmount = pax * numericPrice;

  const handleSave = async () => {
    if (pax <= 0) {
      toast.warning('Pax count must be at least 1.', { title: 'Invalid Pax' });
      return;
    }
    if (numericPrice < 0) {
      toast.warning('Price cannot be negative.', { title: 'Invalid Price' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(pax, numericPrice);
      toast.success(`Door Charge updated to ${pax} pax @ ₱${numericPrice.toLocaleString()}`, {
        title: 'Door Charge Saved',
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update Door Charge', {
        title: 'Update Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    setIsSubmitting(true);
    try {
      await onVoid();
      toast.success('Door Charge removed from tab', {
        title: 'Door Charge Removed',
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to void Door Charge', {
        title: 'Void Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <Ticket size={20} color="#810021" />
              </View>
              <View>
                <Text style={styles.title}>Edit Door Charge</Text>
                <Text style={styles.subtitle}>{tableName}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#1C1917" />
            </Pressable>
          </View>

          {/* Stepper & Price Input */}
          <View style={styles.body}>
            {/* Pax Counter */}
            <View style={styles.inputRow}>
              <View>
                <Text style={styles.label}>Headcount / Pax</Text>
                <Text style={styles.hint}>Number of admission covers</Text>
              </View>
              <View style={styles.stepperContainer}>
                <Pressable
                  onPress={() => setPax((p) => Math.max(1, p - 1))}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.paxText}>{pax}</Text>
                <Pressable onPress={() => setPax((p) => p + 1)} style={styles.stepperBtn}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Price Per Head */}
            <View style={styles.inputRow}>
              <View>
                <Text style={styles.label}>Price per Head</Text>
                <Text style={styles.hint}>Admission rate per guest</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.currencyPrefix}>₱</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceText}
                  onChangeText={setPriceText}
                  keyboardType="numeric"
                  placeholder="300"
                  placeholderTextColor="#78716c"
                />
              </View>
            </View>

            {/* Summary calculation */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Door Charge</Text>
              <Text style={styles.summaryValue}>
                ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleVoid}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.voidBtn,
                pressed && { opacity: 0.8 },
                isSubmitting && { opacity: 0.5 },
              ]}
            >
              <Trash2 size={16} color="#dc2626" />
              <Text style={styles.voidBtnText}>Remove Cover</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.9 },
                isSubmitting && { opacity: 0.5 },
              ]}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.saveBtnText}>{isSubmitting ? 'Saving...' : 'Update Tab'}</Text>
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
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#810021',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
  },
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 16,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  hint: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1917',
    lineHeight: 20,
  },
  paxText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#810021',
    minWidth: 24,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    marginRight: 4,
  },
  priceInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    width: 80,
    textAlign: 'right',
    padding: 0,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#810021',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#810021',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  voidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  voidBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#810021',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
