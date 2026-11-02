import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { preferences } from '@/lib/preferences';
import { useSessionStore } from '@/stores/session.store';

/**
 * S1 Splash / route gate (PLAN 2.10): welcome → sign-in → shop setup → PIN → Home.
 * Renders nothing while deciding; the native splash stays up until fonts and the DB are ready.
 */
export default function Index() {
  const status = useSessionStore((s) => s.status);
  const shopState = useSessionStore((s) => s.shopState);
  const locked = useSessionStore((s) => s.locked);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    preferences
      .getWelcomeSeen()
      .then(setWelcomeSeen)
      .catch(() => setWelcomeSeen(false));
  }, []);

  if (status === 'loading' || welcomeSeen === null) return null;
  if (status === 'signedOut') return <Redirect href={welcomeSeen ? '/sign-in' : '/welcome'} />;
  if (shopState === 'unknown') return null;
  if (shopState === 'none') return <Redirect href="/shop-setup" />;
  if (locked) return <Redirect href="/lock" />;
  return <Redirect href="/home" />;
}
