import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X } from 'lucide-react-native';
import { ToastItemData, useToastStore } from '../../features/shared/toast/useToastStore';

interface ToastCardProps {
  toast: ToastItemData;
}

export const ToastCard: React.FC<ToastCardProps> = ({ toast }) => {
  const dismiss = useToastStore((state) => state.dismiss);

  // Animations
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(-16)).current;
  const animScale = useRef(new Animated.Value(0.96)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance animation
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(animTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(animScale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    const duration = toast.duration ?? 3500;

    // 2. Progress countdown animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false, // width requires false
    }).start();

    // 3. Auto dismiss timer
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animScale, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animTranslateY, {
        toValue: -10,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      dismiss(toast.id);
    });
  };

  const getThemeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          accentColor: '#10b981',
          bgColor: '#064e3b33',
          borderAccent: '#059669',
          Icon: CheckCircle2,
          iconColor: '#34d399',
        };
      case 'error':
        return {
          accentColor: '#ef4444',
          bgColor: '#7f1d1d33',
          borderAccent: '#dc2626',
          Icon: AlertCircle,
          iconColor: '#f87171',
        };
      case 'warning':
        return {
          accentColor: '#f59e0b',
          bgColor: '#78350f33',
          borderAccent: '#d97706',
          Icon: AlertTriangle,
          iconColor: '#fbbf24',
        };
      case 'info':
      default:
        return {
          accentColor: '#d4af37', // Jazz brass gold
          bgColor: 'rgba(212, 175, 55, 0.16)',
          borderAccent: '#c59b27',
          Icon: Sparkles,
          iconColor: '#f6c445',
        };
    }
  };

  const theme = getThemeConfig();
  const IconComponent = theme.Icon;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: animOpacity,
          transform: [{ translateY: animTranslateY }, { scale: animScale }],
          borderLeftColor: theme.accentColor,
        },
      ]}
    >
      <Pressable onPress={handleDismiss} style={styles.innerTouchable} accessibilityRole="alert">
        {/* Left Icon Badge */}
        <View style={[styles.iconBadge, { backgroundColor: theme.bgColor }]}>
          <IconComponent size={18} color={theme.iconColor} strokeWidth={2.4} />
        </View>

        {/* Content Column */}
        <View style={styles.textContainer}>
          {toast.title ? (
            <Text style={styles.titleText} numberOfLines={1}>
              {toast.title}
            </Text>
          ) : null}
          <Text style={styles.messageText} numberOfLines={3}>
            {toast.message}
          </Text>

          {/* Action Button if provided */}
          {toast.action ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                toast.action?.onPress();
                handleDismiss();
              }}
              style={[styles.actionBtn, { borderColor: theme.accentColor }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.accentColor }]}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Close Button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handleDismiss();
          }}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
        >
          <X size={15} color="#94a3b8" />
        </Pressable>
      </Pressable>

      {/* Subtle Progress Bar */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressWidth,
              backgroundColor: theme.accentColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    maxWidth: 390,
    minWidth: 300,
    backgroundColor: '#18181c',
    borderRadius: 14,
    borderLeftWidth: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 10,
  },
  innerTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12.5,
    color: '#d1d5db',
    lineHeight: 17,
  },
  actionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
    marginLeft: 4,
    marginTop: -2,
  },
  progressBarTrack: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressBarFill: {
    height: '100%',
  },
});
