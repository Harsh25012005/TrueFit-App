import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/colors';

import { IconButton } from './Button';
import { Text } from './Text';

export interface TopBarProps {
  title?: string;
  /** Non-root screens show a back button (DESIGN.md §6.6). */
  onBack?: () => void;
  /** Root tab screens: 64 high with a `title-1` title. */
  root?: boolean;
  /** Max 2 icon buttons on the right. */
  actions?: [ReactNode?, ReactNode?];
  /** Leading content instead of the title (Home header: logo + greeting). */
  children?: ReactNode;
  /** Bottom border appears once the content has scrolled. */
  scrolled?: boolean;
  testID?: string;
}

export function TopBar({
  title,
  onBack,
  root = false,
  actions,
  children,
  scrolled = false,
  testID,
}: TopBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: scrolled ? colors.border : 'transparent',
      }}
    >
      <View
        testID={testID ? `${testID}-bar` : undefined}
        style={{
          height: root ? 64 : 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: onBack ? 4 : 16,
          paddingRight: 4,
          gap: 4,
        }}
      >
        {onBack ? (
          <IconButton icon="arrow-left" accessibilityLabel={t('common.back')} onPress={onBack} />
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {children ??
            (title ? (
              <Text
                variant={root ? 'title-1' : 'title-3'}
                accessibilityRole="header"
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : null)}
        </View>
        {actions?.slice(0, 2)}
      </View>
    </View>
  );
}
