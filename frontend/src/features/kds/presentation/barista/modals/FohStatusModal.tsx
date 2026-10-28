import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';
import { X, AlertTriangle, Send, CheckCircle2, User } from 'lucide-react-native';
import { BarTicket } from '../types';

interface FohStatusModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: BarTicket | null;
  onSendSubstitutionRequest: (ticketId: string, suggestion: string) => void;
  onForceUnblock?: (ticketId: string) => void;
  stationTarget?: 'bar' | 'kitchen';
}

const KITCHEN_PRESETS = [
  'Swap for seasonal pasta',
  'Substitute with Margherita Pizza',
  'Offer artisan side dish',
  'Void & refund item',
];

const BAR_PRESETS = [
  'House Red Wine or Asahi Super Dry',
  'Single Origin Pour Over',
  'Monk’s Mocktail',
  'Void & refund drink',
];

export const FohStatusModal: React.FC<FohStatusModalProps> = ({
  visible,
  onClose,
  ticket,
  onSendSubstitutionRequest,
  onForceUnblock,
  stationTarget = 'bar',
}) => {
  const isKitchen = stationTarget === 'kitchen';
  const presets = isKitchen ? KITCHEN_PRESETS : BAR_PRESETS;
  const [suggestion, setSuggestion] = useState(presets[0]);

  if (!ticket) return null;

  const defaultStatusMessage = isKitchen
    ? 'Kitchen item is out of stock. Floor waiter has been alerted to consult the guest for a chef substitution or refund.'
    : 'Craft beverage is out of stock. Waiter has been notified to consult the table for a drink swap or refund.';

  const handleSendPrompt = () => {
    onSendSubstitutionRequest(
      ticket.id,
      `Suggested alternative: ${suggestion.trim() || presets[0]}`
    );
    onClose();
  };

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
              <Text style={styles.modalTitle}>
                {isKitchen ? 'Chef FOH Coordination' : 'FOH Coordination Status'}
              </Text>
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
              <Text style={styles.issueTitle}>
                Action Required: 86'd {isKitchen ? 'Dish' : 'Item'} Ordered
              </Text>
              <Text style={styles.issueDescription}>
                {ticket.fohStatusMessage || defaultStatusMessage}
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
                Assigned Floor Server: {ticket.serverName || 'Floor Waiter'}
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

          {/* Chef / Bartender Suggestion Section */}
          <View style={styles.suggestionSection}>
            <Text style={styles.suggestionLabel}>
              {isKitchen ? "CHEF'S SUGGESTED SWAP" : 'STATION SUGGESTED ALTERNATIVE'}
            </Text>
            <TextInput
              value={suggestion}
              onChangeText={setSuggestion}
              placeholder={
                isKitchen ? 'Type custom dish substitution...' : 'Type custom drink swap...'
              }
              placeholderTextColor="#9ca3af"
              style={styles.suggestionInput}
            />

            {/* Quick Preset Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              {presets.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setSuggestion(preset)}
                  style={[styles.presetPill, suggestion === preset && styles.presetPillActive]}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      suggestion === preset && styles.presetPillTextActive,
                    ]}
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionCol}>
            <Pressable
              onPress={handleSendPrompt}
              style={({ pressed }) => [styles.primaryWineBtn, pressed && styles.btnPressed]}
            >
              <Send size={18} color="#ffffff" />
              <Text style={styles.primaryWineBtnText}>Prompt Floor Waiter with Suggestion</Text>
            </Pressable>

            {onForceUnblock ? (
              <Pressable
                onPress={() => {
                  onForceUnblock(ticket.id);
                  onClose();
                }}
                style={({ pressed }) => [styles.unblockBtn, pressed && styles.btnPressed]}
              >
                <CheckCircle2 size={18} color="#15803d" />
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
  suggestionSection: {
    marginBottom: 18,
    gap: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  suggestionInput: {
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  presetsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  presetPill: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetPillActive: {
    backgroundColor: '#fde8ec',
    borderColor: '#f43f5e',
  },
  presetPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  presetPillTextActive: {
    color: '#832238',
    fontWeight: '700',
  },
  actionCol: {
    gap: 10,
  },
  primaryWineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#701a31',
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryWineBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  unblockBtnText: {
    color: '#15803d',
    fontSize: 16,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
