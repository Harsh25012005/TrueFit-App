import '../global.css';
import '@/i18n';

import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ToastHost } from '@/components/ui';
import { initSentry, wrapRoot } from '@/lib/sentry';
import { themeStyle, useThemeScheme } from '@/theme/colors';
import { navigationTheme } from '@/theme/navigation';
import { FONT_ASSETS } from '@/theme/typography';

initSentry();
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const scheme = useThemeScheme();
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = fontsLoaded || fontError !== null;

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
