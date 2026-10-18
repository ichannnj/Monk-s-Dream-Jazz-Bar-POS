import React from 'react';
import { View, Text, Pressable, Switch, StyleSheet, Modal } from 'react-native';
import { X, LogOut, Volume2, Wifi, Filter } from 'lucide-react-native';

interface StationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleOnline: (val: boolean) => void;
  audioChimes: boolean;
  onToggleAudio: (val: boolean) => void;
  barOnlyFilter: boolean;
  onToggleBarFilter: (val: boolean) => void;
  onClockOut: () => void;
}

export const StationSettingsModal: React.FC<StationSettingsModalProps> = ({
  visible,
  onClose,
  isOnline,
  onToggleOnline,
  audioChimes,
  onToggleAudio,
  barOnlyFilter,
  onToggleBarFilter,
  onClockOut,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Station Settings</Text>
              <Text style={styles.modalSubtitle}>Bar & Barista KDS Configuration</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Settings Rows */}
          <View style={styles.settingsSection}>
            <View style={styles.settingRow}>
              <View style={styles.iconCircle}>
                <Wifi size={18} color="#15803d" />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.settingTitle}>Station Network Sync</Text>
                <Text style={styles.settingDesc}>
                  Receive real-time floor tablet order dispatches
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={onToggleOnline}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={isOnline ? '#15803d' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.iconCircle}>
                <Volume2 size={18} color="#701a31" />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.settingTitle}>Audio Chimes & Rush Chimes</Text>
                <Text style={styles.settingDesc}>
                  Play alert sounds when new drink orders arrive
                </Text>
              </View>
              <Switch
                value={audioChimes}
                onValueChange={onToggleAudio}
                trackColor={{ false: '#d1d5db', true: '#fbcfe8' }}
                thumbColor={audioChimes ? '#701a31' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.iconCircle}>
                <Filter size={18} color="#3b82f6" />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.settingTitle}>Filter: Bar Items Only</Text>
                <Text style={styles.settingDesc}>
                  Hide kitchen food items from tickets on this screen
                </Text>
              </View>
              <Switch
                value={barOnlyFilter}
                onValueChange={onToggleBarFilter}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={barOnlyFilter ? '#1d4ed8' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Clock Out / Lock Station */}
          <View style={styles.footerSection}>
            <Pressable
              onPress={() => {
                onClose();
                onClockOut();
              }}
              style={({ pressed }) => [styles.clockOutBtn, pressed && styles.btnPressed]}
            >
              <LogOut size={16} color="#dc2626" />
              <Text style={styles.clockOutText}>Lock Station / Clock Out</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  settingsSection: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  footerSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  clockOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  clockOutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
