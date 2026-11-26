import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface AnimatedFadeTransitionProps {
  /**
   * Unique key representing the active view/tab.
   * Whenever this value changes, a cross-fade & subtle slide/scale transition is triggered.
   */
  transitionKey: string | number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}

/**
 * AnimatedFadeTransition provides a buttery-smooth cross-fade transition
 * with a subtle vertical lift (8px) when switching between views or screen modes.
 * Built using React Native's native Animated engine for universal Web and Mobile compatibility.
 */
export const AnimatedFadeTransition: React.FC<AnimatedFadeTransitionProps> = ({
  transitionKey,
  children,
  style,
  duration = 200,
}) => {
  const animOpacity = useRef(new Animated.Value(1)).current;
  const animTranslateY = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Reset initial values for enter animation
    animOpacity.setValue(0);
    animTranslateY.setValue(6);

    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(animTranslateY, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [transitionKey, animOpacity, animTranslateY, duration]);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity: animOpacity,
          transform: [{ translateY: animTranslateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
