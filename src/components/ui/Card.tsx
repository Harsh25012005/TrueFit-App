import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/theme/colors';
import { layout, radius } from '@/theme/tokens';

import { Button } from './Button';
import { FocusRing } from './FocusRing';
import { pressTransform, useReducedMotion } from './motion';
import { Skeleton } from './Skeleton';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export type CardVariant = 'default' | 'list' | 'summary' | 'inset';

export interface CardProps {
  children?: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Replaces the body with this message and a "Try again" link. */
  error?: string;
  onRetry?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

function Divider({ vertical = false }: { vertical?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors['border-subtle'] }
          : { height: 1, backgroundColor: colors['border-subtle'] }
      }
    />
  );
}

/** Children with a border-subtle line between each (list rows / summary columns). */
function Separated({ children, vertical }: { children: ReactNode; vertical: boolean }) {
  const items = Children.toArray(children);
  return items.map((child, i) => (
    <Fragment key={i}>
      {i > 0 ? <Divider vertical={vertical} /> : null}
      {vertical ? <View style={{ flex: 1 }}>{child}</View> : child}
    </Fragment>
  ));
}

/** Card family (DESIGN.md §6.4): default, list, summary (3 columns) and inset. */
export function Card({
  children,
  variant = 'default',
  onPress,
  disabled = false,
  loading = false,
  error,
  onRetry,
  accessibilityLabel,
  testID,
}: CardProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const { pressed, active, focused, handlers } = useInteraction(disabled || !onPress);

  const inset = variant === 'inset';
  const padded = variant === 'default' || variant === 'inset';

  let body: ReactNode;
  if (loading) {
    body = (
      <View style={{ gap: 8, padding: padded ? 0 : layout.cardPadding }} testID="card-loading">
        <Skeleton width="50%" />
        <Skeleton width="80%" />
      </View>
    );
  } else if (error) {
    body = (
      <View style={{ gap: 4, padding: padded ? 0 : layout.cardPadding }}>
        <Text color="text-muted">{error}</Text>
        {onRetry ? <Button variant="ghost" label={t('common.tryAgain')} onPress={onRetry} /> : null}
      </View>
    );
  } else if (variant === 'list') {
    body = <Separated vertical={false}>{children}</Separated>;
  } else if (variant === 'summary') {
    body = (
      <View style={{ flexDirection: 'row' }}>
        <Separated vertical>{children}</Separated>
      </View>
    );
  } else {
    body = children;
  }

  const style = {
    backgroundColor: inset || active ? colors['surface-muted'] : colors.surface,
    borderWidth: inset ? 0 : 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: padded ? layout.cardPadding : 0,
    opacity: disabled ? 0.5 : 1,
    overflow: 'hidden' as const,
    transform: pressTransform(pressed, reduced, 0.99),
  };

  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <View style={style}>{body}</View>
      <FocusRing visible={focused} />
    </Pressable>
  );
}
