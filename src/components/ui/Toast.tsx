import { useEffect } from 'react';
import { AccessibilityInfo, Animated, Pressable, useAnimatedValue, View } from 'react-native';

import { useUiStore, type ToastKind } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';
import { motion, radius, type ColorToken } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { useReducedMotion } from './motion';
import { Text } from './Text';

export const TOAST_DURATION = 2500;
export const TOAST_DURATION_WITH_ACTION = 5000;

const ICON: Record<ToastKind, { name: IconName; color: ColorToken }> = {
  success: { name: 'circle-check', color: 'primary' },
  error: { name: 'alert-circle', color: 'error' },
  info: { name: 'info-circle', color: 'on-secondary' },
};

/**
 * Renders the current toast (DESIGN.md §6.8). Mount once near the root, above the tab bar.
 * Show toasts with `showToast()` from `@/stores/ui.store`.
 */
export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  const hideToast = useUiStore((s) => s.hideToast);
  const colors = useColors();
  const reduced = useReducedMotion();
  const anim = useAnimatedValue(0);

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: motion.toast, useNativeDriver: true }).start();
    AccessibilityInfo.announceForAccessibility(toast.message);
    const timer = setTimeout(
      () => hideToast(toast.id),
      toast.action ? TOAST_DURATION_WITH_ACTION : TOAST_DURATION,
    );
    return () => clearTimeout(timer);
  }, [toast, anim, hideToast]);

  if (!toast) return null;
  const icon = ICON[toast.kind];
  const translateY = reduced ? 0 : anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 96, alignItems: 'center' }}
    >
      <Animated.View
        testID="toast"
        accessibilityLiveRegion="polite"
        style={{
          maxWidth: 480,
          width: '100%',
          opacity: anim,
          transform: [{ translateY }],
          backgroundColor: colors.secondary,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Icon name={icon.name} size={18} color={icon.color} />
        <Text color="on-secondary" style={{ flex: 1 }}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            hitSlop={12}
            onPress={() => {
              toast.action?.onPress();
              hideToast(toast.id);
            }}
          >
            <Text variant="body-strong" color="primary-subtle">
              {toast.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
