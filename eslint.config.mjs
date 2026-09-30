import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Vite inlines every import.meta.env.X it can resolve at build time, so
      // a secret read this way lands in the Worker bundle from .env.local.
      // That is how DATABASE_URL and ANTHROPIC_API_KEY shipped inside
      // dist/server until 2026-09-29. Secrets come from getEnv instead.
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='MetaProperty'][object.property.name='env'][property.name!=/^(PUBLIC_\\w+|MODE|DEV|PROD|SSR|BASE_URL|SITE)$/]",
        message: 'Read server secrets with getEnv from astro/env/runtime; import.meta.env inlines them into the bundle.',
      }],
    },
  },
  {
    // Test files use `any` extensively for mock typing; suppress there only
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'test-results/', 'drizzle/migrations/', 'src/env.d.ts'],
  },
]
