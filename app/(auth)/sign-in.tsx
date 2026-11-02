import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, LogoMark, Text } from '@/components/ui';
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn';
import { useColors } from '@/theme/colors';

/** S3 Sign in — method choice (DESIGN.md §7). Google is primary; email is secondary. */
export default function SignInScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const google = useGoogleSignIn();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 16, justifyContent: 'center', gap: 12 }}>
        <View style={{ alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <LogoMark size={64} />
          <Text variant="title-1" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t('auth.signIn.title')}
          </Text>
        </View>
        <Button
          label={t('auth.signIn.google')}
          icon="brand-google"
          fullWidth
          loading={google.busy}
          disabled={!google.available}
          onPress={async () => {
            if (await google.signIn()) router.replace('/');
          }}
        />
        {google.error ? (
          <Text variant="caption" color="error" style={{ textAlign: 'center' }}>
            {google.error}
          </Text>
        ) : null}
        <Button
          label={t('auth.signIn.email')}
          icon="mail"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/email')}
        />
      </View>
      <Text variant="caption" color="text-muted" style={{ textAlign: 'center', padding: 16 }}>
        {t('auth.signIn.terms')}
      </Text>
    </SafeAreaView>
  );
}
