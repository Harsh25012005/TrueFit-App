import { COLOR_TOKENS, themeVariables, toRgbChannels } from './colors';

describe('colors', () => {
  it('converts hex to rgb channels', () => {
    expect(toRgbChannels('#047D55')).toBe('4 125 85');
    expect(toRgbChannels('#ffffff')).toBe('255 255 255');
    expect(() => toRgbChannels('#fff')).toThrow();
  });

  it('builds one CSS variable per token for each scheme', () => {
    const light = themeVariables('light');
    const dark = themeVariables('dark');
    expect(Object.keys(light)).toHaveLength(COLOR_TOKENS.length);
    expect(light['--color-primary']).toBe('4 125 85');
    expect(dark['--color-primary']).toBe('60 203 148');
    expect(light['--color-overlay']).toBe('rgba(10,12,18,0.50)');
  });
});
