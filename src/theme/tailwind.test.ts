import resolveConfig from 'tailwindcss/resolveConfig';

import { COLOR_TOKENS } from './colors';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../tailwind.config.js');
const { theme } = resolveConfig(tailwindConfig) as unknown as {
  theme: Record<string, Record<string, unknown>>;
};

describe('tailwind.config.js', () => {
  it('exposes exactly the DESIGN.md colour tokens (no default palette)', () => {
    expect(Object.keys(theme.colors ?? {}).sort()).toEqual(['transparent', ...COLOR_TOKENS].sort());
    expect(theme.colors?.primary).toBe('rgb(var(--color-primary) / <alpha-value>)');
  });

  it('allows no shadows and nothing rounder than 4 px', () => {
    expect(theme.boxShadow).toEqual({ none: 'none' });
    expect(theme.borderRadius).toEqual({ none: '0px', sm: '2px', md: '4px', DEFAULT: '4px' });
  });
});
