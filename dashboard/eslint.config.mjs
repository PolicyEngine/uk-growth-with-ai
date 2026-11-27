import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';
import ugai from './eslint-rules/ugai.mjs';

export default defineConfig([
  ...nextCoreWebVitals,
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // one chooser, one fold, one card shell (consolidated-design-fable.md
    // section 6): warnings, counted by scripts/ratchet.mjs
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/**/*.test.{js,jsx}'],
    plugins: { ugai },
    rules: {
      'ugai/one-chooser': 'warn',
      'ugai/one-fold': 'warn',
      'ugai/one-card-shell': 'warn',
    },
  },
  {
    files: ['src/app/layout.tsx'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'public/**',
  ]),
]);
