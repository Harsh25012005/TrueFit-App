import type { ConfigContext, ExpoConfig } from 'expo/config';

import { palette } from './src/theme/tokens.ts';

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === 'production' ? 'TrueFit' : `TrueFit (${APP_ENV})`,
  slug: 'truefit',
  version: '0.1.0',
  scheme: 'truefit',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'app.truefit',
    allowBackup: false,
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: palette.light.background,
        dark: { backgroundColor: palette.dark.background },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
