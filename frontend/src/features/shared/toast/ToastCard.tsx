import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, Platform } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X } from 'lucide-react-native';
import { ToastItemData, useToastStore } from './useToastStore';

interface ToastCardProps {
  toast: ToastItemData;
}

export const ToastCard: React.FC<ToastCardProps> = ({ toast }) => {
  const dismiss = useToastStore((state) => state.dismiss);

  // Animations
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(-16)).current;
  const panTranslateX = useRef(new Animated.Value(0)).current;
  const panTranslateY = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(0.96)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Track dismissal state to prevent double dismiss
  const isDismissing = useRef(false);
  const autoDismissTimer = useRef<any>(null);

  const triggerDismiss = (direction: 'up' | 'left' | 'right' | 'fade' = 'fade') => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
    }

    const useDriver = Platform.OS !== 'web';

    let toX = 0;
    let toY = 0;
    if (direction === 'left') {
      toX = -400;
    } else if (direction === 'right') {
      toX = 400;
    } else if (direction === 'up') {
      toY = -120;
    } else {
      toY = -10;
    }

    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: useDriver,
      }),
      Animated.timing(panTranslateX, {
        toValue: toX,
        duration: 200,
        useNativeDriver: useDriver,
      }),
      Animated.timing(panTranslateY, {
        toValue: toY,
        duration: 200,
        useNativeDriver: useDriver,
      }),
      Animated.timing(animScale, {
        toValue: 0.9,
        duration: 180,
        useNativeDriver: useDriver,
      }),
    ]).start(() => {
      dismiss(toast.id);
    });
  };

  // Swipe-to-dismiss PanResponder (supports swiping UP, LEFT, or RIGHT)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detect horizontal drag or upwards drag
        const isHorizontal = Math.abs(gestureState.dx) > 10;
        const isUpward = gestureState.dy < -10;
        return isHorizontal || isUpward;
      },
      onPanResponderGrant: () => {
        // Pause auto-dismiss timer during active gesture
        if (autoDismissTimer.current) {
          clearTimeout(autoDismissTimer.current);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDismissing.current) return;

        // Swiping UP: allow negative Y translation
        if (gestureState.dy < 0) {
          panTranslateY.setValue(gestureState.dy);
        } else {
          // Slight resistance if dragging downwards
          panTranslateY.setValue(gestureState.dy * 0.2);
        }

        // Swiping Left/Right
        panTranslateX.setValue(gestureState.dx);

        // Dynamic fade as card is dragged away
        const distance = Math.max(
          Math.abs(gestureState.dx),
          gestureState.dy < 0 ? Math.abs(gestureState.dy) : 0
        );
        const dragRatio = Math.min(distance / 200, 1);
        animOpacity.setValue(1 - dragRatio * 0.6);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDismissing.current) return;

        const SWIPE_THRESHOLD_X = 75;
        const SWIPE_THRESHOLD_Y = -60;
        const VELOCITY_THRESHOLD = 0.4;

        // 1. Swiped UP
        if (
          gestureState.dy < SWIPE_THRESHOLD_Y ||
          (gestureState.dy < -20 && gestureState.vy < -VELOCITY_THRESHOLD)
        ) {
          triggerDismiss('up');
          return;
        }

        // 2. Swiped LEFT
        if (
          gestureState.dx < -SWIPE_THRESHOLD_X ||
          (gestureState.dx < -20 && gestureState.vx < -VELOCITY_THRESHOLD)
        ) {
          triggerDismiss('left');
          return;
        }

        // 3. Swiped RIGHT
        if (
          gestureState.dx > SWIPE_THRESHOLD_X ||
          (gestureState.dx > 20 && gestureState.vx > VELOCITY_THRESHOLD)
        ) {
          triggerDismiss('right');
          return;
        }

        // Snap back if threshold not met
        const useDriver = Platform.OS !== 'web';
        Animated.parallel([
          Animated.spring(panTranslateX, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: useDriver,
          }),
          Animated.spring(panTranslateY, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: useDriver,
          }),
          Animated.timing(animOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: useDriver,
          }),
        ]).start();

        // Resume remaining auto-dismiss timer
        autoDismissTimer.current = setTimeout(() => {
          triggerDismiss('fade');
        }, 2000);
      },
      onPanResponderTerminate: () => {
        // Reset position on termination
        const useDriver = Platform.OS !== 'web';
        Animated.parallel([
          Animated.spring(panTranslateX, { toValue: 0, useNativeDriver: useDriver }),
          Animated.spring(panTranslateY, { toValue: 0, useNativeDriver: useDriver }),
          Animated.timing(animOpacity, { toValue: 1, duration: 150, useNativeDriver: useDriver }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    const useDriver = Platform.OS !== 'web';

    // 1. Entrance animation
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: useDriver,
      }),
      Animated.spring(animTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: useDriver,
      }),
      Animated.spring(animScale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: useDriver,
      }),
    ]).start();

    const duration = toast.duration ?? 3500;

    // 2. Progress countdown animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // 3. Auto dismiss timer
    autoDismissTimer.current = setTimeout(() => {
      triggerDismiss('fade');
    }, duration);

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, []);

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
      {...panResponder.panHandlers}
      style={[
        styles.cardContainer,
        {
          opacity: animOpacity,
          transform: [
            { translateY: Animated.add(animTranslateY, panTranslateY) },
            { translateX: panTranslateX },
            { scale: animScale },
          ],
          borderLeftColor: theme.accentColor,
          ...(Platform.OS === 'web'
            ? ({
                cursor: 'grab',
                userSelect: 'none',
                touchAction: 'none',
              } as any)
            : {}),
        },
      ]}
    >
      <View style={styles.innerTouchable} accessibilityRole="alert">
        {/* Left Icon Badge */}
        <View style={[styles.iconBadge, { backgroundColor: theme.bgColor }]}>
          <IconComponent size={18} color={theme.iconColor} strokeWidth={2.4} aria-hidden={true} />
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
                triggerDismiss('fade');
              }}
              style={[styles.actionBtn, { borderColor: theme.accentColor }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.accentColor }]}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Optional Clickable Dismiss button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            triggerDismiss('fade');
          }}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
        >
          <X size={15} color="#94a3b8" aria-hidden={true} />
        </Pressable>
      </View>

      {/* Progress Countdown Bar */}
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
