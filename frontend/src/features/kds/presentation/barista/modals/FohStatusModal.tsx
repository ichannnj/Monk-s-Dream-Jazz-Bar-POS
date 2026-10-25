import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { X, AlertTriangle, Send, CheckCircle2, User } from 'lucide-react-native';
import { BarTicket } from '../types';

interface FohStatusModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: BarTicket | null;
  onSendSubstitutionRequest: (ticketId: string, suggestion: string) => void;
  onForceUnblock?: (ticketId: string) => void;
}

export const FohStatusModal: React.FC<FohStatusModalProps> = ({
  visible,
  onClose,
  ticket,
  onSendSubstitutionRequest,
  onForceUnblock,
}) => {
  if (!ticket) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close FOH status modal"
        />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>FOH Coordination Status</Text>
              <Text style={styles.modalSubtitle}>
                {ticket.orderNumber} · {ticket.tableOrSource}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Issue Summary Card */}
          <View style={styles.issueBanner}>
            <AlertTriangle size={20} color="#991b1b" />
            <View style={styles.issueTextCol}>
              <Text style={styles.issueTitle}>Action Required: Out of Stock Item Ordered</Text>
              <Text style={styles.issueDescription}>
                {ticket.fohStatusMessage ||
                  'Craft IPA is out of stock. Waiter has been notified to consult the table for a drink swap or refund.'}
              </Text>
            </View>
          </View>

          {/* Waiter Info Card */}
          <View style={styles.waiterCard}>
            <View style={styles.waiterAvatar}>
              <User size={18} color="#701a31" />
            </View>
            <View style={styles.waiterCol}>
              <Text style={styles.waiterName}>
                Assigned Floor Server: {ticket.serverName || 'Jess Santos (FOH Waiter)'}
              </Text>
              <Text style={styles.waiterStatus}>
                Status: Tablet notified · Awaiting guest preference
              </Text>
            </View>
          </View>

          {/* Ticket Items Overview */}
          <View style={styles.itemsOverview}>
            <Text style={styles.itemsSectionLabel}>ORDER ITEMS</Text>
            {ticket.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.quantity}×</Text>
                <Text style={styles.itemName}>
                  {item.productName}
                  {item.is86 ? <Text style={styles.outOfStockText}> · Out of Stock</Text> : null}
                  {item.isVoided ? <Text style={styles.voidText}> (Voided)</Text> : null}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionCol}>
            <Pressable
              onPress={() => {
                onSendSubstitutionRequest(
                  ticket.id,
                  'Suggested alternative: House Red Wine or Asahi Super Dry'
                );
                onClose();
              }}
              style={({ pressed }) => [styles.primaryWineBtn, pressed && styles.btnPressed]}
            >
              <Send size={16} color="#ffffff" />
              <Text style={styles.primaryWineBtnText}>
                Prompt Waiter for Swap (Asahi or Red Wine)
              </Text>
            </Pressable>

            {onForceUnblock ? (
              <Pressable
                onPress={() => {
                  onForceUnblock(ticket.id);
                  onClose();
                }}
                style={({ pressed }) => [styles.unblockBtn, pressed && styles.btnPressed]}
              >
                <CheckCircle2 size={16} color="#15803d" />
                <Text style={styles.unblockBtnText}>
                  Guest Accepted Alternative · Unblock Order
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#701a31',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  issueBanner: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  issueTextCol: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 2,
  },
  issueDescription: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  waiterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf4f6',
    borderWidth: 1,
    borderColor: '#f5e4e8',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  waiterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fce7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiterCol: {
    flex: 1,
  },
  waiterName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  waiterStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemsOverview: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  itemsSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  outOfStockText: {
    color: '#991b1b',
    fontWeight: '800',
  },
  voidText: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  actionCol: {
    gap: 10,
  },
  primaryWineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#701a31',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryWineBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  unblockBtnText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
