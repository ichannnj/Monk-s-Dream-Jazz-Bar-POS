import React from 'react';
import { View, Text, Modal, Pressable, Image, StyleSheet } from 'react-native';
import { X, QrCode, Check } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { QrPaymentChannel } from '../../data/qrPaymentChannels.api';

interface FullscreenQrModalProps {
  visible: boolean;
  channel: QrPaymentChannel | null;
  amount: number;
  onClose: () => void;
}

export const FullscreenQrModal: React.FC<FullscreenQrModalProps> = ({
  visible,
  channel,
  amount,
  onClose,
}) => {
  if (!visible || !channel) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss fullscreen QR scanner"
        />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <QrCode size={20} color="#800020" />
              </View>
              <View>
                <Text style={styles.channelTitle}>{channel.name} Payment</Text>
                <Text style={styles.scanNotice}>Scan with your banking or wallet app</Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close QR scanner"
            >
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Amount Due Banner */}
          <View style={styles.amountBanner}>
            <Text style={styles.amountLabel}>EXACT AMOUNT DUE</Text>
            <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
          </View>

          {/* High-Resolution QR Card */}
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: channel.qr_image_url }}
              style={styles.qrImage}
              resizeMode="contain"
              accessibilityLabel={`${channel.name} QR Code`}
            />
          </View>

          {/* Account Details Box */}
          <View style={styles.accountBox}>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Account Name:</Text>
              <Text style={styles.accountValue} numberOfLines={1}>
                {channel.account_name}
              </Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Account / Mobile:</Text>
              <Text style={styles.accountNumber}>{channel.account_number}</Text>
            </View>
          </View>

          {/* Action / Done Button */}
          <Pressable
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Done scanning, return to checkout"
          >
            <Check size={18} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.doneBtnText}>Done Scanning · Input Reference #</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 0, 32, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  scanNotice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBanner: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748b',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#800020',
    letterSpacing: -0.5,
  },
  qrContainer: {
    width: 250,
    height: 250,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  accountBox: {
    width: '100%',
    backgroundColor: '#fdf8f6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde4d8',
    padding: 12,
    gap: 6,
    marginBottom: 18,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c2d12',
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#431407',
    maxWidth: '65%',
  },
  accountNumber: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#800020',
  },
  doneBtn: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#800020',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#800020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
