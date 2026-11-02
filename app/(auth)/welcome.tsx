import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, LogoMark, Segmented, Text, Wordmark, type IconName } from '@/components/ui';
import { currentLanguage, setLanguage, type Language } from '@/i18n';
import { preferences } from '@/lib/preferences';
import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

const SLIDES: { icon: IconName; key: 'slide1' | 'slide2' | 'slide3' }[] = [
  { icon: 'ruler', key: 'slide1' },
  { icon: 'receipt', key: 'slide2' },
  { icon: 'cash', key: 'slide3' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'EN', script: 'latin' },
  { value: 'gu', label: 'ગુ', script: 'gujarati' },
  { value: 'hi', label: 'हि', script: 'devanagari' },
] as const;

/** S2 Welcome slides (DESIGN.md §7). */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const [language, setLang] = useState<Language>(currentLanguage());
  const slide = SLIDES[index] ?? SLIDES[0]!;
  const last = index === SLIDES.length - 1;

  const goToSignIn = () => {
    preferences.setWelcomeSeen().catch(() => undefined);
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoMark size={32} />
          <View style={{ flex: 1 }}>
            <Wordmark size={20} />
          </View>
          <View style={{ width: 150 }}>
            <Segmented
              accessibilityLabel={t('welcome.languageLabel')}
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={(lang) => {
                setLang(lang);
                setLanguage(lang);
              }}
            />
          </View>
        </View>

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}
          accessibilityLabel={t('welcome.slideOf', { current: index + 1, total: SLIDES.length })}
        >
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: radius.md,
              backgroundColor: colors['primary-subtle'],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={slide.icon} size={48} color="primary" />
          </View>
          <Text variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t(`welcome.${slide.key}Title`)}
          </Text>
          <Text color="text-muted" style={{ textAlign: 'center' }}>
            {t(`welcome.${slide.key}Text`)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: radius.sm,
                backgroundColor: i === index ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label={t('common.skip')} variant="secondary" fullWidth onPress={goToSignIn} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={last ? t('welcome.getStarted') : t('common.next')}
              fullWidth
              onPress={last ? goToSignIn : () => setIndex(index + 1)}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
