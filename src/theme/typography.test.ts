import { FONT_ASSETS, fontFamily, textStyle } from './typography';

describe('fontFamily', () => {
  it('maps script + weight to a loaded font', () => {
    expect(fontFamily('latin', '600')).toBe('PlusJakartaSans_600SemiBold');
    expect(fontFamily('gujarati', '400')).toBe('NotoSansGujarati_400Regular');
    expect(fontFamily('devanagari', '800')).toBe('NotoSansDevanagari_800ExtraBold');
  });

  it('loads every family textStyle can return', () => {
    for (const script of ['latin', 'gujarati', 'devanagari'] as const) {
      for (const weight of ['400', '500', '600', '700', '800'] as const) {
        expect(FONT_ASSETS).toHaveProperty(fontFamily(script, weight));
      }
    }
  });
});

describe('textStyle', () => {
  it('returns the DESIGN.md size, line height and font', () => {
    expect(textStyle('body')).toEqual({
      fontFamily: 'PlusJakartaSans_400Regular',
      fontSize: 16,
      lineHeight: 24,
    });
  });

  it('uses Noto fonts and adds 2 dp line height for Gujarati and Hindi', () => {
    expect(textStyle('body', { script: 'gujarati' })).toMatchObject({
      fontFamily: 'NotoSansGujarati_400Regular',
      lineHeight: 26,
    });
    expect(textStyle('body', { script: 'devanagari' }).lineHeight).toBe(26);
  });

  it('scales by 1.15 for Large text', () => {
    expect(textStyle('body', { largeText: true })).toMatchObject({ fontSize: 18, lineHeight: 28 });
  });

  it('uses Latin tabular figures for numbers in any language', () => {
    expect(textStyle('title-2', { script: 'gujarati', numeric: true })).toMatchObject({
      fontFamily: 'PlusJakartaSans_700Bold',
      fontVariant: ['tabular-nums'],
      lineHeight: 26,
    });
  });

  it('accepts a weight override', () => {
    expect(textStyle('caption', { weight: '600' }).fontFamily).toBe('PlusJakartaSans_600SemiBold');
  });

  it('uppercases overline only for Latin', () => {
    expect(textStyle('overline')).toMatchObject({
      textTransform: 'uppercase',
      letterSpacing: 0.96,
    });
    expect(textStyle('overline', { script: 'gujarati' }).textTransform).toBeUndefined();
  });
});
