import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, PinDots, PinPad, Switch, Text } from '@/components/ui';
import { canUseBiometrics, setBiometricEnabled, setPin } from '@/features/auth/pin';
import { showToast } from '@/stores/ui.store';
import { useSessionStore } from '@/stores/session.store';
import { useColors } from '@/theme/colors';

/** S10 Set PIN (DESIGN.md §7, PRD F1 step 5). Optional: "Skip for now". */
export default function SetPinScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [useFingerprint, setUseFingerprint] = useState(false);

  useEffect(() => {
    canUseBiometrics()
      .then(setBiometricsAvailable)
      .catch(() => setBiometricsAvailable(false));
  }, []);

  const goHome = () => router.replace('/home');

  async function complete(entered: string) {
    if (first === null) {
      setFirst(entered);
      setPinValue('');
      setError(null);
      return;
    }
    if (entered !== first) {
      setFirst(null);
      setPinValue('');
      setError(t('pin.mismatch'));
      return;
    }
    await setPin(entered);
    await setBiometricEnabled(biometricsAvailable && useFingerprint);
    useSessionStore.getState().setHasPin(true);
    showToast({ message: t('pin.saved'), kind: 'success' });
    goHome();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 24 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text variant="caption" color="text-muted">
            {t('shopSetup.step', { current: 2, total: 2 })}
          </Text>
          <Text variant="title-1" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {first === null ? t('pin.createTitle') : t('pin.confirmTitle')}
          </Text>
        </View>
        <PinDots count={pin.length} />
        {error ? (
          <Text
            variant="caption"
            color="error"
            accessibilityLiveRegion="polite"
            style={{ textAlign: 'center' }}
          >
            {error}
          </Text>
        ) : null}
        <PinPad value={pin} onChange={setPinValue} onComplete={complete} />
        {biometricsAvailable ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text>{t('pin.fingerprint')}</Text>
            <Switch
              value={useFingerprint}
              onValueChange={setUseFingerprint}
              accessibilityLabel={t('pin.fingerprint')}
            />
          </View>
        ) : null}
        <View style={{ alignItems: 'center' }}>
          <Button variant="ghost" align="center" label={t('pin.skip')} onPress={goHome} />
        </View>
      </View>
    </SafeAreaView>
  );
}
