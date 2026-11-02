import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, IconButton, Input, Segmented, TopBar } from '@/components/ui';
import {
  emailPasswordSchema,
  fieldErrors,
  signInSchema,
  type FieldErrors,
} from '@/features/auth/auth.schema';
import { resendCode, signInWithEmail, signUpWithEmail } from '@/features/auth/auth.service';
import { authErrorKey } from '@/features/auth/authErrors';
import { toAppError } from '@/lib/errors';
import { useColors } from '@/theme/colors';

type Mode = 'signIn' | 'create';
type Field = 'email' | 'password';

/** S6 Email sign in / create account (DESIGN.md §7). */
export default function EmailScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = (mode === 'create' ? emailPasswordSchema : signInSchema).safeParse({
      email,
      password,
    });
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (mode === 'create') {
        await signUpWithEmail(parsed.data.email, parsed.data.password);
        router.push({
          pathname: '/verify-otp',
          params: { email: parsed.data.email, purpose: 'signup' },
        });
      } else {
        await signInWithEmail(parsed.data.email, parsed.data.password);
        router.replace('/');
      }
    } catch (e) {
      const err = toAppError(e);
      if (err.details?.reason === 'email_not_confirmed') {
        // Confirm first: send a fresh code and go to the code screen.
        await resendCode(parsed.data.email, 'signup').catch(() => undefined);
        router.push({
          pathname: '/verify-otp',
          params: { email: parsed.data.email, purpose: 'signup' },
        });
        return;
      }
      const key = authErrorKey(err);
      setErrors(key === 'auth.errors.emailExists' ? { email: key } : { password: key });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={t('auth.email.title')} onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Segmented
          accessibilityLabel={t('auth.email.title')}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setErrors({});
          }}
          options={[
            { value: 'signIn', label: t('auth.email.signInTab') },
            { value: 'create', label: t('auth.email.createTab') },
          ]}
        />
        <Input
          label={t('auth.email.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          error={errors.email ? t(errors.email) : undefined}
          testID="email"
        />
        <Input
          label={t('auth.email.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          textContentType={mode === 'create' ? 'newPassword' : 'password'}
          returnKeyType="done"
          onSubmitEditing={submit}
          hint={mode === 'create' ? t('auth.email.passwordHint') : undefined}
          error={errors.password ? t(errors.password) : undefined}
          suffix={
            <IconButton
              icon={showPassword ? 'eye-off' : 'eye'}
              accessibilityLabel={
                showPassword ? t('auth.email.hidePassword') : t('auth.email.showPassword')
              }
              color="text-muted"
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          testID="password"
        />
        <Button
          label={mode === 'create' ? t('auth.email.createButton') : t('auth.email.signInButton')}
          fullWidth
          loading={busy}
          onPress={submit}
          testID="submit"
        />
        {mode === 'signIn' ? (
          <View style={{ alignItems: 'center' }}>
            <Button
              variant="ghost"
              align="center"
              label={t('auth.email.forgot')}
              onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
