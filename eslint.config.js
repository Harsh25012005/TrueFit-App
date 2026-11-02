// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// INTEGRATIONS.md: third-party SDKs may only be imported inside their wrapper files.
const SDK_WRAPPERS = [
  {
    name: '@supabase/supabase-js',
    files: ['src/lib/supabase.ts', 'src/features/auth/auth.service.ts', 'src/sync/**'],
  },
  { name: '@react-native-google-signin/google-signin', files: ['src/lib/google.ts'] },
  { name: 'react-native-purchases', files: ['src/features/subscription/purchases.service.ts'] },
  { name: '@sentry/react-native', files: ['src/lib/sentry.ts'] },
];

const restrictedSdkImports = {
  paths: SDK_WRAPPERS.map(({ name, files }) => ({
    name,
    message: `Import ${name} only through its wrapper (${files.join(', ')}).`,
  })),
};

// DESIGN.md: colours come from src/theme tokens only — no hex literals in UI code.
const COLOUR_LITERALS = [
  // whole-string hex ('#047D55'), Tailwind arbitrary values ('bg-[#fff]') and rgb()/rgba()
  'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  'Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/]',
  'Literal[value=/rgba?\\(/]',
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'coverage/*', 'src/types/supabase.ts'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', restrictedSdkImports],
      // eslint-plugin-import can't follow Tabler's per-icon `exports` map; Metro and Jest can.
      'import/no-unresolved': ['error', { ignore: ['^@tabler/icons-react-native/'] }],
    },
  },
  // A wrapper and its own test may import the SDK (the test mocks it).
  ...SDK_WRAPPERS.map(({ name, files }) => ({
    files: [...files, ...files.map((f) => f.replace(/\.ts$/, '.test.ts'))],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: restrictedSdkImports.paths.filter((p) => p.name !== name) },
      ],
    },
  })),
  {
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...COLOUR_LITERALS.map((selector) => ({
          selector,
          message: 'Use a token from src/theme instead of a colour literal.',
        })),
      ],
    },
  },
]);
