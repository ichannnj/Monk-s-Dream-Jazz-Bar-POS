import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
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
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 520;
  const isLandscape = width > height && isCompactHeight;

  if (!visible || !channel) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, isCompactHeight && { padding: 8 }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss fullscreen QR scanner"
        />

        <View
          style={[
            styles.card,
            isLandscape ? { maxWidth: 640 } : { maxWidth: 420 },
            isCompactHeight && { maxHeight: '98%', padding: 14 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <QrCode size={18} color="#810021" />
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
              <X size={18} color="#1A1617" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ width: '100%' }}
            contentContainerStyle={
              isLandscape
                ? { flexDirection: 'row', alignItems: 'center', gap: 16 }
                : { alignItems: 'center' }
            }
          >
            {/* High-Resolution QR Card */}
            <View
              style={[
                styles.qrContainer,
                isLandscape
                  ? { width: 170, height: 170, marginBottom: 0 }
                  : isCompactHeight
                    ? { width: 170, height: 170 }
                    : null,
              ]}
            >
              <Image
                source={{ uri: channel.qr_image_url }}
                style={styles.qrImage}
                resizeMode="contain"
                accessibilityLabel={`${channel.name} QR Code`}
              />
            </View>

            {/* Right Side / Bottom Details */}
            <View style={isLandscape ? { flex: 1, gap: 8 } : { width: '100%' }}>
              {/* Amount Due Banner */}
              <View
                style={[
                  styles.amountBanner,
                  isCompactHeight && { paddingVertical: 6, marginBottom: 8 },
                ]}
              >
                <Text style={styles.amountLabel}>EXACT AMOUNT DUE</Text>
                <Text style={[styles.amountValue, isCompactHeight && { fontSize: 20 }]}>
                  {formatCurrency(amount)}
                </Text>
              </View>

              {/* Account Details Box */}
              <View
                style={[styles.accountBox, isCompactHeight && { padding: 8, marginBottom: 10 }]}
              >
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
                <Check size={18} color="#F7F5F2" strokeWidth={2.5} />
                <Text style={styles.doneBtnText}>Done Scanning · Input Reference #</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#F7F5F2',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 20,
    maxHeight: '94%',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFECE6',
    borderWidth: 1,
    borderColor: '#E2DED6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1617',
  },
  scanNotice: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78716C',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFECE6',
    borderWidth: 1,
    borderColor: '#E2DED6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBanner: {
    width: '100%',
    backgroundColor: '#EFECE6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DED6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#78716C',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#810021',
  },
  qrContainer: {
    width: 220,
    height: 220,
    backgroundColor: '#F7F5F2',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2DED6',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  accountBox: {
    width: '100%',
    backgroundColor: '#EFECE6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DED6',
    padding: 10,
    gap: 4,
    marginBottom: 14,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1617',
    maxWidth: '65%',
  },
  accountNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#810021',
  },
  doneBtn: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#810021',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F7F5F2',
  },
});
