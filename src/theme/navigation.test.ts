import { navigationTheme } from './navigation';
import { palette } from './tokens';

describe('navigationTheme', () => {
  it('gives React Navigation token colours, not its default grey', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = navigationTheme(scheme);
      expect(theme.dark).toBe(scheme === 'dark');
      expect(theme.colors).toEqual({
        primary: palette[scheme].primary,
        background: palette[scheme].background,
        card: palette[scheme].surface,
        text: palette[scheme].text,
        border: palette[scheme].border,
        notification: palette[scheme].error,
      });
    }
  });
});
