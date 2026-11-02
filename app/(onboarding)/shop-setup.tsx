import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Input, PhoneInput, Segmented, Text, TopBar } from '@/components/ui';
import { fieldErrors, type FieldErrors } from '@/features/auth/auth.schema';
import { authErrorKey } from '@/features/auth/authErrors';
import { createShop } from '@/features/shop/shop.repo';
import { shopSetupSchema } from '@/features/shop/shop.schema';
import { currentLanguage, setLanguage, type Language } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { useSessionStore } from '@/stores/session.store';
import { useColors } from '@/theme/colors';

type Field = 'ownerName' | 'shopName' | 'phone' | 'form';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', script: 'latin' },
  { value: 'gu', label: 'ગુજરાતી', script: 'gujarati' },
  { value: 'hi', label: 'हिन्दी', script: 'devanagari' },
] as const;

/** S9 Shop setup (DESIGN.md §7, PRD F1 steps 4 + 6). Online only: calls create_shop. */
export default function ShopSetupScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const userId = useSessionStore((s) => s.user?.userId);
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLang] = useState<Language>(currentLanguage());
  const [start, setStart] = useState<'fresh' | 'sample'>('fresh');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = shopSetupSchema.safeParse({
      ownerName,
      shopName,
      phone,
      language,
      withSample: start === 'sample',
    });
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      return;
    }
    if (!userId) return;
    setErrors({});
    setBusy(true);
    try {
      const shopId = await createShop(userId, parsed.data);
      await setLanguage(parsed.data.language);
      useSessionStore.getState().setShop(shopId);
      router.replace('/set-pin');
    } catch (e) {
      const err = toAppError(e);
      setErrors({ form: err.code === 'NETWORK_OFFLINE' ? 'shopSetup.offline' : authErrorKey(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar root title={t('shopSetup.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text variant="caption" color="text-muted">
          {t('shopSetup.step', { current: 1, total: 2 })}
        </Text>
        <Input
          label={t('shopSetup.ownerName')}
          value={ownerName}
          onChangeText={setOwnerName}
          autoComplete="name"
          maxLength={60}
          error={errors.ownerName ? t(errors.ownerName) : undefined}
        />
        <Input
          label={t('shopSetup.shopName')}
          value={shopName}
          onChangeText={setShopName}
          maxLength={40}
          error={errors.shopName ? t(errors.shopName) : undefined}
        />
        <PhoneInput
          label={`${t('shopSetup.shopPhone')} (${t('common.optional')})`}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone ? t(errors.phone) : undefined}
        />
        <View style={{ gap: 6 }}>
          <Text variant="label" color="text-muted">
            {t('shopSetup.language')}
          </Text>
          <Segmented
            accessibilityLabel={t('shopSetup.language')}
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(lang) => {
              setLang(lang);
              setLanguage(lang);
            }}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="label" color="text-muted">
            {t('shopSetup.startLabel')}
          </Text>
          <Segmented
            accessibilityLabel={t('shopSetup.startLabel')}
            value={start}
            onChange={setStart}
            options={[
              { value: 'fresh', label: t('shopSetup.startFresh') },
              { value: 'sample', label: t('shopSetup.sample') },
            ]}
          />
          <Text variant="caption" color="text-muted">
            {t('shopSetup.sampleHint')}
          </Text>
        </View>
        {errors.form ? (
          <Text variant="caption" color="error" accessibilityLiveRegion="polite">
            {t(errors.form)}
          </Text>
        ) : null}
        <Button label={t('shopSetup.continue')} fullWidth loading={busy} onPress={submit} />
      </ScrollView>
    </View>
  );
}
