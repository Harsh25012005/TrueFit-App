import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Input, Text, TopBar } from '@/components/ui';
import { emailSchema } from '@/features/auth/auth.schema';
import { requestPasswordReset } from '@/features/auth/auth.service';
import { authErrorKey } from '@/features/auth/authErrors';
import { toAppError } from '@/lib/errors';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

/** S7 Forgot password — sends a 6-digit reset code (no account enumeration). */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(t('auth.errors.invalidEmail'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(parsed.data);
      showToast({ message: t('auth.forgot.sent'), kind: 'success' });
      router.push({ pathname: '/verify-otp', params: { email: parsed.data, purpose: 'recovery' } });
    } catch (e) {
      setError(t(authErrorKey(toAppError(e))));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={t('auth.forgot.title')} onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text color="text-muted">{t('auth.forgot.text')}</Text>
        <Input
          label={t('auth.email.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={send}
          error={error ?? undefined}
        />
        <Button label={t('auth.forgot.send')} fullWidth loading={busy} onPress={send} />
      </ScrollView>
    </View>
  );
}
