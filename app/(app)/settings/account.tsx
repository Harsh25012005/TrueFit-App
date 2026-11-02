import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Dialog, Input, ListRow, Sheet, Text, TopBar } from '@/components/ui';
import { deleteAccount, signOutAndWipe } from '@/features/auth/account';
import { authErrorKey } from '@/features/auth/authErrors';
import { toAppError } from '@/lib/errors';
import { useSessionStore } from '@/stores/session.store';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

const CONFIRM_WORD = 'DELETE';

/** S29 Account — sign-in method, sign out, delete account (typed confirmation). */
export default function AccountScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const user = useSessionStore((s) => s.user);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const method = user?.provider === 'google' ? t('account.methodGoogle') : t('account.methodEmail');

  async function signOut() {
    setConfirmSignOut(false);
    await signOutAndWipe();
    router.replace('/');
  }

  async function confirmDelete() {
    setBusy(true);
    setError(undefined);
    try {
      await deleteAccount(typed);
      showToast({ message: t('account.deleteScheduled'), kind: 'info' });
      router.replace('/');
    } catch (e) {
      setError(t(authErrorKey(toAppError(e))));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={t('account.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card variant="list">
          <ListRow
            title={t('account.signedInWith', { method })}
            subtitle={user?.email ?? undefined}
          />
        </Card>
        <Button
          label={t('common.signOut')}
          variant="secondary"
          fullWidth
          onPress={() => setConfirmSignOut(true)}
        />
        <Button
          label={t('account.delete')}
          variant="destructive"
          icon="trash"
          fullWidth
          onPress={() => setDeleteOpen(true)}
        />
      </ScrollView>

      <Dialog
        visible={confirmSignOut}
        title={t('account.signOutTitle')}
        message={t('account.signOutText')}
        actions={[{ label: t('common.signOut'), onPress: signOut }]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmSignOut(false)}
      />

      <Sheet
        visible={deleteOpen}
        title={t('account.deleteTitle')}
        onClose={() => {
          setDeleteOpen(false);
          setTyped('');
          setError(undefined);
        }}
        busy={busy}
        error={error}
        footer={
          <Button
            label={t('account.deleteConfirm')}
            variant="destructive"
            loading={busy}
            disabled={typed !== CONFIRM_WORD}
            onPress={confirmDelete}
            testID="confirm-delete"
          />
        }
      >
        <Text color="text-muted">{t('account.deleteText')}</Text>
        <Input
          label={t('account.deleteTypeLabel')}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          testID="delete-confirm-input"
        />
      </Sheet>
    </View>
  );
}
