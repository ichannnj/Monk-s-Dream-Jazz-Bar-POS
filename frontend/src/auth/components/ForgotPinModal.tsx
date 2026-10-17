import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { ShieldCheck, X, ShieldAlert, UserCheck } from 'lucide-react-native';

interface ForgotPinModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({ visible, onClose }) => {
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
                <ShieldCheck size={20} color="#641b2a" />
              </View>
              <View>
                <Text style={styles.title}>Credential Security</Text>
                <Text style={styles.subtitle}>Monk's Dream Jazz Bar POS</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* Security Policy Notice */}
          <View style={styles.noticeBox}>
            <ShieldAlert size={18} color="#991b1b" style={{ marginTop: 2, marginRight: 8 }} />
            <Text style={styles.noticeText}>
              For audit security and shift fraud prevention, staff PINs are confidential and cannot be viewed on floor tablets.
            </Text>
          </View>

          <Text style={styles.instructionText}>
            If you have forgotten your PIN or your account is locked, contact a Shift Administrator to verify your identity and reset your PIN in the Admin Accounts Dashboard.
          </Text>

          {/* Admin Contact Reference */}
          <Text style={styles.sectionTitle}>Shift Administrators:</Text>
          <View style={styles.adminCard}>
            <View style={styles.adminAvatar}>
              <UserCheck size={18} color="#641b2a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminName}>Miles (Manager)</Text>
              <Text style={styles.adminRole}>Shift Administrator · Admin Accounts Panel</Text>
            </View>
          </View>

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
  instructionText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f7e8eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  adminRole: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
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
