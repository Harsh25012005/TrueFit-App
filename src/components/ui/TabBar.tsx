import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { Icon, type IconName } from './Icon';
import { pressTransform, useReducedMotion } from './motion';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export type TabKey = 'home' | 'orders' | 'customers' | 'more';

export interface TabItem {
  key: TabKey;
  icon: IconName;
  /** Late-orders count on Orders (DESIGN.md §6.6). */
  badge?: number;
}

export const TABS: TabItem[] = [
  { key: 'home', icon: 'home' },
  { key: 'orders', icon: 'receipt' },
  { key: 'customers', icon: 'users' },
  { key: 'more', icon: 'dots' },
];

const EDGE = 12;

function Tab({ item, active, onPress }: { item: TabItem; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const { focused, handlers } = useInteraction();
  const label = t(`tabs.${item.key}`);
  const color = active ? 'primary' : 'text-muted';
  const badgeText = item.badge && item.badge > 99 ? '99+' : String(item.badge ?? '');

  return (
    <Pressable
      onPress={onPress}
      {...handlers}
      accessibilityRole="tab"
      accessibilityLabel={item.badge ? `${label}, ${item.badge}` : label}
      accessibilityState={{ selected: active }}
      testID={`tab-${item.key}`}
      style={{
        flex: 1,
        minHeight: 56,
        borderRadius: radius.md,
        backgroundColor: active ? colors['primary-subtle'] : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 2,
      }}
    >
      <View>
        <Icon name={item.icon} size={22} color={color} />
        {item.badge ? (
          <View
            testID={`tab-${item.key}-badge`}
            style={{
              position: 'absolute',
              top: -6,
              right: -12,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: radius.sm,
              backgroundColor: colors.error,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="overline"
              color="on-error"
              numeric
              style={{ textTransform: 'none', letterSpacing: 0 }}
            >
              {badgeText}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" weight={active ? '600' : undefined} color={color} numberOfLines={1}>
        {label}
      </Text>
      <FocusRing visible={focused} />
    </Pressable>
  );
}

export interface TabBarProps {
  active: TabKey;
  onTabPress: (key: TabKey) => void;
  onAddPress: () => void;
  /** Overrides for badges per tab. */
  badges?: Partial<Record<TabKey, number>>;
}

/** Floating bottom tab bar (DESIGN.md §6.6): 4 tabs + separate 64×64 Add button. */
export function TabBar({ active, onTabPress, onAddPress, badges = {} }: TabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const add = useInteraction();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: EDGE,
        right: EDGE,
        bottom: EDGE + insets.bottom,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'stretch',
      }}
    >
      <View
        testID="tabbar-group"
        style={{
          flex: 1,
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: 4,
          gap: 4,
        }}
      >
        {TABS.map((item) => (
          <Tab
            key={item.key}
            item={{ ...item, badge: badges[item.key] }}
            active={active === item.key}
            onPress={() => onTabPress(item.key)}
          />
        ))}
      </View>
      <Pressable
        testID="tabbar-add"
        onPress={onAddPress}
        {...add.handlers}
        accessibilityRole="button"
        accessibilityLabel={t('tabs.create')}
        style={{
          width: 64,
          height: 64,
          alignSelf: 'center',
          borderRadius: radius.md,
          backgroundColor: add.active ? colors['primary-pressed'] : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          transform: pressTransform(add.pressed, reduced, 0.94),
        }}
      >
        <Icon name="plus" size={28} color="on-primary" />
        <FocusRing visible={add.focused} />
      </Pressable>
    </View>
  );
}
