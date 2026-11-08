import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';
import { X, AlertTriangle, Send, CheckCircle2, User } from 'lucide-react-native';
import { BarTicket } from '../types';
import { styles } from './FohStatusModal.styles';

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
