import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, AlertTriangle, Check, ShieldAlert } from 'lucide-react-native';
import { BarTicket, BarItemLine } from '../../barista/types';
import { toast } from '@/features/shared/toast/useToastStore';

interface KdsVoidModalProps {
  visible: boolean;
  ticket: BarTicket | null;
  item: BarItemLine | null;
  onClose: () => void;
  onConfirmVoid: (reason: string, pin?: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Spill / Waste',
  'Out of Stock / 86',
  'Customer Walked Away',
  'Order Mistake',
  'Customer Changed Mind',
];

export const KdsVoidModal: React.FC<KdsVoidModalProps> = ({
  visible,
  ticket,
  item,
  onClose,
  onConfirmVoid,
}) => {
  const [selectedReason, setSelectedReason] = useState('Spill / Waste');
  const [customReason, setCustomReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible || (!ticket && !item)) return null;

  const targetTitle = item
    ? `Void Item: ${item.productName}`
    : `Cancel Entire Ticket: ${ticket?.orderNumber}`;

  const isPostPrep = item
    ? item.status === 'preparing' || item.status === 'ready'
    : ticket?.stage === 'preparing' || ticket?.stage === 'ready';

  const handleConfirm = async () => {
    const finalReason = customReason.trim() || selectedReason;
    if (!finalReason) {
      toast.warning('Please select or specify a cancellation reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmVoid(finalReason, managerPin.trim() || undefined);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to void item from station');
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
            <View style={styles.headerTitleGroup}>
              <View style={styles.iconBadge}>
                <AlertTriangle size={18} color="#dc2626" />
              </View>
              <View>
                <Text style={styles.titleText}>{targetTitle}</Text>
                <Text style={styles.subtitleText}>
                  {ticket?.tableOrSource} · Round {ticket?.roundNumber || 1}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="#78716c" />
            </Pressable>
          </View>

          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <ShieldAlert size={16} color="#b91c1c" />
            <Text style={styles.warningBannerText}>
              {isPostPrep
                ? 'Item was in preparation/ready. Ingredients will be auto-logged as waste spoilage.'
                : 'Item is pending. Stock will be restored to inventory.'}
            </Text>
          </View>

          {/* Reason Presets */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Select Preset Reason</Text>
            <View style={styles.presetsGrid}>
              {PRESET_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[styles.presetChip, selectedReason === reason && styles.presetChipActive]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      selectedReason === reason && styles.presetChipTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Custom Reason Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Additional Notes / Reason</Text>
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="e.g. Glass cracked, dropped drink, customer left counter..."
              placeholderTextColor="#a8a29e"
              style={styles.textInput}
            />
          </View>

          {/* Footer Action Buttons */}
          <View style={styles.footer}>
            <Pressable onPress={onClose} disabled={isSubmitting} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Check size={16} color="#ffffff" />
              )}
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Cancelling...' : 'Confirm Void'}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c1917',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  warningBannerText: {
    fontSize: 11,
    color: '#991b1b',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#44403c',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
  },
  presetChipActive: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534e',
  },
  presetChipTextActive: {
    color: '#991b1b',
    fontWeight: '800',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1c1917',
    backgroundColor: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#57534e',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#dc2626',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
