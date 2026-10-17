import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createPortal } from 'react-dom';
import { useToastStore } from '../../store/useToastStore';
import { ToastCard } from './ToastCard';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  const content = (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        Platform.OS === 'web' ? styles.webContainer : styles.nativeContainer,
      ]}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </View>
  );

  // In web environment, attach portal to document.body so toasts float over all modals
  if (Platform.OS === 'web' && typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 999999,
    alignItems: 'flex-end',
    maxWidth: 420,
  },
  webContainer: {
    position: 'fixed' as any,
    top: 20,
    right: 20,
    zIndex: 999999,
  },
  nativeContainer: {
    position: 'absolute',
    top: 40,
    right: 16,
    left: 16,
    alignItems: 'center',
    zIndex: 999999,
  },
});
