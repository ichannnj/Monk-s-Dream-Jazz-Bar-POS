import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { HelpCircle, X, ShieldAlert, KeyRound } from 'lucide-react-native';
import { SEED_STAFF_USERS } from '../../mockData';

interface ForgotPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectStaff?: (staff: (typeof SEED_STAFF_USERS)[0]) => void;
}

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({ visible, onClose, onSelectStaff }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <KeyRound size={20} color="#641b2a" />
              </View>
              <View>
                <Text style={styles.title}>Staff PIN Recovery</Text>
                <Text style={styles.subtitle}>Monk's Dream Jazz Bar Security</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* Alert Notice */}
          <View style={styles.noticeBox}>
            <ShieldAlert size={16} color="#b93a52" />
            <Text style={styles.noticeText}>
              Tap any demo staff account below to auto-fill credentials for testing.
            </Text>
          </View>

          {/* Staff Reference List */}
          <Text style={styles.sectionTitle}>Default Staff Accounts (Tap to Select):</Text>
          <ScrollView style={styles.staffList} showsVerticalScrollIndicator={false}>
            {SEED_STAFF_USERS.map((staff) => (
              <Pressable
                key={staff.id}
                onPress={() => onSelectStaff?.(staff)}
                style={({ pressed }) => [
                  styles.staffRow,
                  pressed && { opacity: 0.7, backgroundColor: '#fef2f2' },
                ]}
              >
                <View>
                  <Text style={styles.staffName}>{staff.displayName}</Text>
                  <Text style={styles.staffUsername}>ID: {staff.username} • Role: {staff.role}</Text>
                </View>
                <View style={styles.pinBadge}>
                  <Text style={styles.pinText}>{staff.pin}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* Close button */}
          <Pressable onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissBtnText}>Return to Clock-In</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 6, 9, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f7e8eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fdf5f6',
    borderWidth: 1,
    borderColor: '#f7e8eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    color: '#641b2a',
    flex: 1,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staffList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginBottom: 6,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  staffUsername: {
    fontSize: 11,
    color: '#6b7280',
  },
  pinBadge: {
    backgroundColor: '#641b2a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  dismissBtn: {
    backgroundColor: '#641b2a',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
