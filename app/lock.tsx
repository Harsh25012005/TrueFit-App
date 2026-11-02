import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Dialog, LogoMark, PinDots, PinPad, Text } from '@/components/ui';
import { signOutAndWipe } from '@/features/auth/account';
import {
  isBiometricEnabled,
  lockRemainingMs,
  unlockWithBiometrics,
  verifyPin,
} from '@/features/auth/pin';
import { getLocalProfile, getLocalShop } from '@/features/shop/shop.repo';
import { useSessionStore } from '@/stores/session.store';
import { useColors } from '@/theme/colors';

/** S11 PIN unlock (DESIGN.md §7, PRD M3). "Forgot?" signs out and needs a full sign-in. */
export default function LockScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const userId = useSessionStore((s) => s.user?.userId);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [biometric, setBiometric] = useState(false);
  const [names, setNames] = useState<{ owner: string; shop: string }>({ owner: '', shop: '' });
  const [confirmForgot, setConfirmForgot] = useState(false);

  const unlock = useCallback(() => {
    useSessionStore.getState().setLocked(false);
    router.replace('/home');
  }, []);

  const tryBiometric = useCallback(async () => {
    if (await unlockWithBiometrics(t('pin.biometricPrompt')).catch(() => false)) unlock();
  }, [t, unlock]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getLocalProfile(userId), getLocalShop(userId)])
      .then(([profile, shop]) =>
        setNames({ owner: profile?.fullName ?? '', shop: shop?.name ?? '' }),
      )
      .catch(() => undefined);
    lockRemainingMs().then((ms) => setLockedSeconds(Math.ceil(ms / 1000)));
    isBiometricEnabled().then((on) => {
      setBiometric(on);
      if (on) tryBiometric();
    });
  }, [userId, tryBiometric]);

  useEffect(() => {
    if (lockedSeconds <= 0) return;
    const id = setTimeout(() => setLockedSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [lockedSeconds]);

  async function complete(entered: string) {
    const result = await verifyPin(entered);
    setPin('');
    if (result.ok) {
      unlock();
      return;
    }
    if (result.reason === 'no_pin') {
      unlock();
      return;
    }
    setError(t('pin.wrong'));
    if (result.lockedForMs > 0) setLockedSeconds(Math.ceil(result.lockedForMs / 1000));
  }

  async function forgot() {
    setConfirmForgot(false);
    await signOutAndWipe();
    router.replace('/');
  }

  const locked = lockedSeconds > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 20 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <LogoMark size={64} />
          <Text variant="title-2" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t('pin.welcomeBack', { name: names.owner })}
          </Text>
          {names.shop ? <Text color="text-muted">{names.shop}</Text> : null}
        </View>
        <PinDots count={pin.length} />
        <Text
          variant="caption"
          color="error"
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', minHeight: 18 }}
        >
          {locked ? t('pin.lockedFor', { seconds: lockedSeconds }) : (error ?? '')}
        </Text>
        <PinPad
          value={pin}
          onChange={(v) => {
            setPin(v);
            setError(null);
          }}
          onComplete={complete}
          onBiometric={biometric ? tryBiometric : undefined}
          disabled={locked}
        />
        <View style={{ alignItems: 'center' }}>
          <Button
            variant="ghost"
            align="center"
            label={t('pin.forgot')}
            onPress={() => setConfirmForgot(true)}
          />
        </View>
      </View>
      <Dialog
        visible={confirmForgot}
        title={t('pin.forgotTitle')}
        message={t('pin.forgotText')}
        actions={[{ label: t('common.signOut'), variant: 'destructive', onPress: forgot }]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmForgot(false)}
      />
    </SafeAreaView>
  );
}
