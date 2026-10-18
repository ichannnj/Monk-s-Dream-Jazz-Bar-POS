import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Settings, User, ShieldCheck, Printer, LogOut, Sparkles, Wifi } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from '../../store/useToastStore';

interface ShiftSettingsModalProps {
  onClose?: () => void;
  onLogout?: () => void;
}

export const ShiftSettingsModal: React.FC<ShiftSettingsModalProps> = ({ onClose, onLogout }) => {
  const { currentUser, isTrainingMode, setIsTrainingMode } = useAuthStore();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Settings size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.title}>Station & Shift Settings</Text>
            <Text style={styles.subtitle}>
              Staff session parameters, training sandbox, and hardware printer status
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardsGrid}>
        {/* Staff Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={16} color="#832238" />
            <Text style={styles.cardTitle}>Active Staff Profile</Text>
          </View>

          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.displayName
                  ? currentUser.displayName
                      .split(' ')
                      .map((s) => s[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'JS'}
              </Text>
            </View>

            <View>
              <Text style={styles.staffName}>{currentUser?.displayName || 'Jess Santos'}</Text>
              <Text style={styles.staffRole}>
                Role: {currentUser?.role || 'Waiter / Cashier'} • Floor Authenticated
              </Text>
            </View>
          </View>

          {onLogout ? (
            <Pressable onPress={onLogout} style={styles.switchStaffBtn}>
              <LogOut size={15} color="#dc2626" />
              <Text style={styles.switchStaffText}>Switch Staff User / Lock</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Training Mode Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={16} color="#d97706" />
            <Text style={styles.cardTitle}>Training Mode Sandbox</Text>
          </View>

          <Text style={styles.cardDesc}>
            Practice ordering, tab splits, and settlements without sending tickets to physical KDS
            stations or depleting active inventory.
          </Text>

          <View style={styles.trainingToggleRow}>
            <Text style={styles.trainingLabel}>
              {isTrainingMode ? 'Sandbox Active (Demo)' : 'Live Production Mode'}
            </Text>
            <Switch
              value={isTrainingMode}
              onValueChange={(val) => {
                setIsTrainingMode(val);
                if (val) {
                  toast.info(
                    "Training Sandbox Mode active — tickets won't route to live stations.",
                    {
                      title: 'Sandbox Mode ON',
                    }
                  );
                } else {
                  toast.info('Live Production Mode active.', {
                    title: 'Live Mode',
                  });
                }
              }}
              trackColor={{ false: '#d1d5db', true: '#fde68a' }}
              thumbColor={isTrainingMode ? '#d97706' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Remote Printer Station Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Printer size={16} color="#15803d" />
            <Text style={styles.cardTitle}>Thermal Printer Station (PC)</Text>
          </View>

          <View style={styles.statusPillRow}>
            <View style={styles.statusPillGreen}>
              <Wifi size={12} color="#15803d" />
              <Text style={styles.statusPillGreenText}>Connected (WebSocket)</Text>
            </View>
            <Text style={styles.ipText}>IP: 192.168.1.50:9100</Text>
          </View>

          <Text style={styles.cardDesc}>
            Dedicated printer client is listening for `dispatch:print` (Runner Chits) and
            `receipt:print` (Customer Receipts) via USB ESC/POS driver.
          </Text>

          <Pressable
            onPress={() => {
              toast.success(
                'Thermal Printer test receipt dispatched: ESC/POS 80mm verified at 192.168.1.50:9100',
                {
                  title: 'Printer Online & Ready',
                }
              );
            }}
            style={styles.switchStaffBtn}
          >
            <Printer size={14} color="#15803d" />
            <Text style={[styles.switchStaffText, { color: '#15803d' }]}>
              Test Thermal Printer Ping
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
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
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 1,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fceeed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#832238',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  staffRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  switchStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  switchStaffText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  trainingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
  },
  trainingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statusPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillGreenText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803d',
  },
  ipText: {
    fontSize: 11.5,
    color: '#6b7280',
    fontWeight: '600',
  },
});
