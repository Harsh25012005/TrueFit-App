import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, CodeInput, Text, TopBar } from '@/components/ui';
import { codeSchema } from '@/features/auth/auth.schema';
import { resendCode, verifyEmailCode, type CodePurpose } from '@/features/auth/auth.service';
import { authErrorKey } from '@/features/auth/authErrors';
import { toAppError } from '@/lib/errors';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

const RESEND_SECONDS = 60; // API.md §0: 1 email per 60 s
const MAX_WRONG = 5; // FEATURES.md M1: wrong code 5× → wait message

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** S5 Email code verify — after sign-up and for password reset (DESIGN.md §7). */
export default function VerifyCodeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const params = useLocalSearchParams<{ email: string; purpose: CodePurpose }>();
  const email = params.email ?? '';
  const purpose: CodePurpose = params.purpose === 'recovery' ? 'recovery' : 'signup';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const blocked = wrong >= MAX_WRONG;

  async function verify(value = code) {
    if (!codeSchema.safeParse(value).success) {
      setError(t('auth.errors.codeFormat'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyEmailCode(email, value, purpose);
      router.replace(purpose === 'recovery' ? '/reset-password' : '/');
    } catch (e) {
      const err = toAppError(e);
      const tries = wrong + 1;
      setWrong(tries);
      setCode('');
      setError(t(tries >= MAX_WRONG ? 'auth.errors.tooManyTries' : authErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await resendCode(email, purpose);
      setWrong(0);
      setError(null);
      setSecondsLeft(RESEND_SECONDS);
      showToast({ message: t('auth.verify.resent'), kind: 'success' });
    } catch (e) {
      setError(t(authErrorKey(toAppError(e))));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 20 }}
      >
        <View style={{ gap: 8 }}>
          <Text variant="title-1" accessibilityRole="header">
            {t('auth.verify.title')}
          </Text>
          <Text color="text-muted">{t('auth.verify.sentTo', { email })}</Text>
        </View>
        <CodeInput
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setError(null);
          }}
          onComplete={blocked ? undefined : verify}
          accessibilityLabel={t('auth.verify.codeLabel')}
          error={Boolean(error)}
          disabled={blocked || busy}
          testID="code"
        />
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
        <Button
          label={t('auth.verify.verify')}
          fullWidth
          loading={busy}
          disabled={blocked || code.length !== 6}
          onPress={() => verify()}
        />
        <View style={{ alignItems: 'center' }}>
          <Button
            variant="ghost"
            align="center"
            label={
              secondsLeft > 0
                ? t('auth.verify.resendIn', { time: formatTimer(secondsLeft) })
                : t('auth.verify.resend')
            }
            disabled={secondsLeft > 0}
            onPress={resend}
          />
        </View>
      </ScrollView>
    </View>
  );
}
