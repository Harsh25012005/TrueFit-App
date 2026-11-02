// Tailwind (NativeWind 4). Every value comes from src/theme/tokens.ts — nothing is defined here.
// Colours resolve through CSS variables set on the root view (src/theme/colors.ts), so one
// class like `bg-surface` works in light and dark mode.
const { palette, radius, spacing, typeScale } = require('./src/theme/tokens.ts');

const colors = Object.fromEntries(
  Object.entries(palette.light).map(([token, value]) => [
    token,
    value.startsWith('#') ? `rgb(var(--color-${token}) / <alpha-value>)` : `var(--color-${token})`,
  ]),
);

const px = (n) => `${n}px`;
const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Replace (not extend) so only DESIGN.md values exist: no default palette, radii or shadows.
    colors: { transparent: 'transparent', ...colors },
    spacing: mapValues(spacing, px),
    borderRadius: { ...mapValues(radius, px), DEFAULT: px(radius.md) },
    boxShadow: { none: 'none' },
    fontSize: mapValues(typeScale, (t) => [
      px(t.size),
      {
        lineHeight: px(t.lineHeight),
        fontWeight: t.weight,
        ...(t.letterSpacing ? { letterSpacing: px(t.letterSpacing) } : {}),
      },
    ]),
    extend: {},
  },
  plugins: [],
};
