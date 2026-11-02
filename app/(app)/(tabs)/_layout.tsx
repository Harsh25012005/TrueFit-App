import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TabBar, type TabKey } from '@/components/ui';
import { showToast } from '@/stores/ui.store';

const TAB_KEYS: TabKey[] = ['home', 'orders', 'customers', 'more'];

/** Root tabs with the floating TabBar (DESIGN.md §6.6). */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => {
        const active = (state.routes[state.index]?.name ?? 'home') as TabKey;
        return (
          <TabBar
            active={active}
            onTabPress={(key) => {
              const route = state.routes.find((r) => r.name === key);
              if (route) navigateToTab(route.key);
            }}
            // The Create menu (New order / Measurement / Customer) arrives with those features.
            onAddPress={() => showToast({ message: t('common.comingSoon'), kind: 'info' })}
          />
        );
      }}
    >
      {TAB_KEYS.map((key) => (
        <Tabs.Screen key={key} name={key} />
      ))}
    </Tabs>
  );
}
