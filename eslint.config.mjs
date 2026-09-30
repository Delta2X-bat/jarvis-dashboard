import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    settings: {
      // Pinned instead of 'detect': eslint-plugin-react's version detection
      // calls context.getFilename(), which ESLint 10 removed.
      react: { version: '19.2' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // React Compiler rules (react-hooks v7). The app doesn't use the compiler,
      // and these flag deliberate patterns: client-only values set in an effect
      // after mount to avoid hydration mismatches, refs re-assigned during render
      // for the keyboard-nav listener, and Date.now() in the dashboard server
      // component. Kept visible as warnings rather than silenced.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', '.claude/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
