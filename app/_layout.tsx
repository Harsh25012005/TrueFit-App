import '../global.css';
import '@/i18n';

import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ToastHost } from '@/components/ui';
import { useDeviceMigrations } from '@/db/client';
import { useAuthBootstrap } from '@/features/auth/useAuthBootstrap';
import { logger } from '@/lib/logger';
import { initSentry, wrapRoot } from '@/lib/sentry';
import { themeStyle, useThemeScheme } from '@/theme/colors';
import { navigationTheme } from '@/theme/navigation';
import { FONT_ASSETS } from '@/theme/typography';

initSentry();
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const scheme = useThemeScheme();
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const migrations = useDeviceMigrations();
  const fontsReady = fontsLoaded || fontError !== null;
  const dbReady = migrations.success || migrations.error !== undefined;
  const ready = fontsReady && dbReady;
  useAuthBootstrap(migrations.success);

  useEffect(() => {
    if (migrations.success) logger.info('Device DB ready');
    if (migrations.error) logger.error('Device DB migration failed', migrations.error);
  }, [migrations.success, migrations.error]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      <View style={[{ flex: 1 }, themeStyle(scheme)]} className="bg-background">
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
        <ToastHost />
      </View>
    </ThemeProvider>
  );
}

export default wrapRoot(RootLayout);
