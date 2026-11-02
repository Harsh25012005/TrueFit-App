import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Input, TopBar } from '@/components/ui';
import { fieldErrors, newPasswordSchema, type FieldErrors } from '@/features/auth/auth.schema';
import { updatePassword } from '@/features/auth/auth.service';
import { authErrorKey } from '@/features/auth/authErrors';
import { toAppError } from '@/lib/errors';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

type Field = 'password' | 'confirm';

/** S8 Reset password — opened after the recovery code is verified on S5. */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const parsed = newPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await updatePassword(parsed.data.password);
      showToast({ message: t('auth.reset.saved'), kind: 'success' });
      router.replace('/');
    } catch (e) {
      setErrors({ password: authErrorKey(toAppError(e)) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={t('auth.reset.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Input
          label={t('auth.reset.newPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          hint={t('auth.email.passwordHint')}
          error={errors.password ? t(errors.password) : undefined}
        />
        <Input
          label={t('auth.reset.confirm')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={save}
          error={errors.confirm ? t(errors.confirm) : undefined}
        />
        <Button label={t('auth.reset.save')} fullWidth loading={busy} onPress={save} />
      </ScrollView>
    </View>
  );
}
