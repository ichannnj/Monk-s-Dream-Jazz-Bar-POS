import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { SharedAlertsView } from '../../../shared/SharedAlertsView';

interface SharedAlertsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const SharedAlertsDrawer: React.FC<SharedAlertsDrawerProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close alerts"
        />
        <View style={styles.modalCard}>
          <SharedAlertsView onBack={onClose} backLabel="Close Alerts" />
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
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 980,
    height: '92%',
    backgroundColor: '#f6f0ed',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
});
