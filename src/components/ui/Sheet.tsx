import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  useAnimatedValue,
  View,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { Banner } from './Banner';
import { IconButton } from './Button';
import { Dialog } from './Dialog';
import { useReducedMotion } from './motion';
import { Text } from './Text';

/** Drag distance that closes the sheet (DESIGN.md §6.5). */
export const SHEET_CLOSE_DRAG = 110;

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Sticky footer actions, separated from the body by border-subtle. */
  footer?: ReactNode;
  /** Unsaved form changes: closing asks "Discard changes?" first. */
  dirty?: boolean;
  /** Saving: footer shows the spinner (via its Button) and the sheet cannot be dismissed. */
  busy?: boolean;
  /** Inline error banner at the top of the body. */
  error?: string;
  testID?: string;
}

/** Bottom sheet — the default container for forms (DESIGN.md §6.5). */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
  dirty = false,
  busy = false,
  error,
  testID,
}: SheetProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const dragY = useAnimatedValue(0);
  const titleRef = useRef<ComponentRef<typeof RNText>>(null);

  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) setConfirming(true);
    else onClose();
  }, [busy, dirty, onClose]);

  // Recreated only when the close behaviour changes; nothing re-renders during a drag.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > SHEET_CLOSE_DRAG) requestClose();
          Animated.timing(dragY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
        },
      }),
    [dragY, requestClose],
  );

  // DESIGN.md §8.3: focus moves to the sheet title when it opens.
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      const node = titleRef.current && findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduced ? 'fade' : 'slide'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ flex: 1 }}
          onPress={requestClose}
          accessible={false}
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <KeyboardAvoidingView behavior="padding" style={{ maxHeight: '92%' }}>
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.md,
              borderTopWidth: 1,
              borderColor: colors.border,
              transform: [{ translateY: dragY }],
            }}
          >
            <View {...pan.panHandlers} testID={testID ? `${testID}-drag` : undefined}>
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: radius.sm,
                    backgroundColor: colors.border,
                  }}
                />
              </View>
              <View
                style={{
                  height: 56,
                  paddingLeft: 16,
                  paddingRight: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text
                  ref={titleRef}
                  variant="title-2"
                  accessibilityRole="header"
                  style={{ flex: 1 }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <IconButton
                  icon="x"
                  accessibilityLabel={t('common.close')}
                  onPress={requestClose}
                  disabled={busy}
                />
              </View>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}
            >
              {error ? <Banner variant="error" message={error} /> : null}
              {children}
            </ScrollView>
            {footer ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: colors['border-subtle'],
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12 + insets.bottom,
                  flexDirection: 'row',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                {footer}
              </View>
            ) : (
              <View style={{ height: insets.bottom }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
      <Dialog
        visible={confirming}
        title={t('sheet.discardTitle')}
        message={t('sheet.discardMessage')}
        actions={[
          {
            label: t('sheet.discard'),
            variant: 'destructive',
            onPress: () => {
              setConfirming(false);
              onClose();
            },
          },
        ]}
        cancelLabel={t('sheet.keepEditing')}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  );
}
