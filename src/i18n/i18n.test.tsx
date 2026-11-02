import { act, render, screen } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';

import i18n, { deviceLanguage, findMissingKeys, resources, setLanguage } from './index';

const mockGetLocales = getLocales as jest.Mock;
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

describe('translation files', () => {
  // L1
  it.each(['gu', 'hi'] as const)('en and %s have identical keys', (lang) => {
    const other = resources[lang].translation;
    expect(findMissingKeys(resources.en.translation, other)).toEqual([]);
    expect(findMissingKeys(other, resources.en.translation)).toEqual([]);
  });

  it('has no empty strings', () => {
    for (const { translation } of Object.values(resources)) {
      expect(JSON.stringify(translation)).not.toContain('""');
    }
  });
});

describe('findMissingKeys', () => {
  it('reports dotted paths of missing keys', () => {
    expect(findMissingKeys({ a: { b: 'x', c: 'y' }, d: 'z' }, { a: { b: 'x' } })).toEqual([
      'a.c',
      'd',
    ]);
  });
});

describe('runtime', () => {
  afterEach(() => act(() => setLanguage('en')));

  // L4
  it('falls back to English for a key missing in Gujarati', async () => {
    await setLanguage('gu');
    i18n.addResource('en', 'translation', 'test.onlyEnglish', 'Only English');
    expect(i18n.t('test.onlyEnglish')).toBe('Only English');
    expect(i18n.t('common.save')).toBe('સેવ કરો');
  });

  it('uses the device language when supported, else English', () => {
    mockGetLocales.mockReturnValueOnce([{ languageCode: 'hi' }]);
    expect(deviceLanguage()).toBe('hi');
    mockGetLocales.mockReturnValueOnce([{ languageCode: 'fr' }, { languageCode: 'gu' }]);
    expect(deviceLanguage()).toBe('gu');
    mockGetLocales.mockReturnValueOnce([{ languageCode: 'fr' }]);
    expect(deviceLanguage()).toBe('en');
  });

  // L3
  it('switches visible text and font without a restart', async () => {
    function SaveLabel() {
      const { t } = useTranslation();
      return <Text testID="label">{t('common.save')}</Text>;
    }
    await render(<SaveLabel />);
    expect(screen.getByText('Save')).toBeTruthy();

    await act(() => setLanguage('hi'));
    expect(screen.getByText('सेव करें')).toBeTruthy();
    expect(screen.getByTestId('label')).toHaveStyle({
      fontFamily: 'NotoSansDevanagari_400Regular',
    });

    await act(() => setLanguage('gu'));
    expect(screen.getByText('સેવ કરો')).toBeTruthy();
    expect(screen.getByTestId('label')).toHaveStyle({ fontFamily: 'NotoSansGujarati_400Regular' });
  });
});
