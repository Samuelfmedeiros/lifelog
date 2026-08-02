import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import astro from 'eslint-plugin-astro';
import * as astroParser from 'astro-eslint-parser';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      // MDX é conteúdo, não código — lint só aplica em src/** código
      'src/content/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'no-undef': 'off',
    },
  },
  {
    files: ['src/**/*.astro', 'src/**/*.mdx'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.astro'],
      },
      sourceType: 'module',
    },
    plugins: { astro },
    rules: {
      ...astro.configs.recommended.rules,
      'astro/no-unused-css-selector': 'warn',
      'astro/no-unused-define-vars-in-style': 'warn',
    },
  },
  {
    files: ['e2e/**/*.spec.ts'],
    rules: {
      // Helpers evaluateAll usam `any` intencionalmente
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Scripts utilitários Node (captura de screenshots/video) — não são testes
    files: ['e2e/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        document: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      'security/detect-object-injection': 'off',
    },
  },
);
