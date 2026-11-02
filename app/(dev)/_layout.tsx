import { Redirect, Stack } from 'expo-router';

// Developer-only screens (token check, kitchen sink). Never reachable in release builds.
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
