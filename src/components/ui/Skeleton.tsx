import { useEffect } from 'react';
import { Animated, useAnimatedValue, View, type DimensionValue } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { useReducedMotion } from './motion';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  testID?: string;
}

/** Placeholder block matching the final layout (DESIGN.md §6.9); static when motion is reduced. */
export function Skeleton({ width = '100%', height = 16, testID }: SkeletonProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const opacity = useAnimatedValue(1);

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [reduced, opacity]);

  return (
    <Animated.View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius.md,
        backgroundColor: colors['surface-muted'],
        opacity,
      }}
    />
  );
}

/** List placeholder: rows the height of a ListRow (FEATURES.md: lists load with skeleton rows). */
export function SkeletonRows({ count = 5, label }: { count?: number; label: string }) {
  return (
    <View accessible accessibilityLabel={label} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ minHeight: 56, paddingVertical: 12, paddingHorizontal: 16, gap: 6 }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
      ))}
    </View>
  );
}
