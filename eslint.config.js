import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `_data` / `_variables` style parameters are deliberate placeholders.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // shadcn primitives export their style variants next to the component, and
    // the context providers export a hook next to the provider. Both are
    // standard patterns; they only cost a full reload instead of fast refresh in dev.
    files: ['src/components/ui/**', 'src/lib/auth-context.tsx', 'src/lib/theme-provider.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
