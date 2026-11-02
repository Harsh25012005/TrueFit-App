import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/stores/session.store';

/** Signed-in area: needs a session and a shop; the PIN lock comes first when set (PLAN 2.10). */
export default function AppLayout() {
  const status = useSessionStore((s) => s.status);
  const shopState = useSessionStore((s) => s.shopState);
  const locked = useSessionStore((s) => s.locked);

  if (status !== 'signedIn' || shopState !== 'ready') return <Redirect href="/" />;
  if (locked) return <Redirect href="/lock" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
