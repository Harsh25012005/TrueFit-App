import { Modal, View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: Exclude<ButtonVariant, 'ghost'>;
  loading?: boolean;
  testID?: string;
}

export interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Stacked full-width; the first is the main action (DESIGN.md §6.5). */
  actions: DialogAction[];
  cancelLabel: string;
  onCancel: () => void;
  testID?: string;
}

/** Centred confirmation dialog on the overlay. Back button = cancel (unless an action is busy). */
export function Dialog({
  visible,
  title,
  message,
  actions,
  cancelLabel,
  onCancel,
  testID,
}: DialogProps) {
  const colors = useColors();
  const busy = actions.some((a) => a.loading);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={busy ? undefined : onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          testID={testID}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: 20,
            gap: 8,
          }}
        >
          <Text variant="title-3" accessibilityRole="header">
            {title}
          </Text>
          {message ? <Text color="text-muted">{message}</Text> : null}
          <View style={{ gap: 8, marginTop: 12 }}>
            {actions.map((a) => (
              <Button
                key={a.label}
                label={a.label}
                onPress={a.onPress}
                variant={a.variant ?? 'primary'}
                loading={a.loading}
                disabled={busy && !a.loading}
                fullWidth
                testID={a.testID}
              />
            ))}
            <Button
              label={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              disabled={busy}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
