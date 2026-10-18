import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { fixupPluginRules } from '@eslint/compat';
import reactPlugin from 'eslint-plugin-react';
import reactNativePlugin from 'eslint-plugin-react-native';
import tailwindPlugin from 'eslint-plugin-tailwindcss';

export default tseslint.config(
  // 1. Global ignore patterns (compiled artifacts, lockfiles, temporary files, agent scripts)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/.temp/**',
      '**/.agents/**',
      '**/*.d.ts',
      'packages/*/src/**/*.js',
      '**/packages/shared/src/database.types.ts',
      '**/scripts/**',
      '**/docs/**',
      '**/supabase/**',
    ],
  },

  // 2. Base JavaScript & TypeScript Configuration
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Shared Global Rules across all TS/JS files
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },

  // 4. Configuration Files (Node environment)
  {
    files: ['**/*.config.{js,cjs,mjs}', '**/babel.config.js', '**/metro.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },

  // 5. React Native & Tablet POS Front-End Rules
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      react: fixupPluginRules(reactPlugin),
      'react-native': fixupPluginRules(reactNativePlugin),
      tailwindcss: tailwindPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      tailwindcss: {
        config: './frontend/tailwind.config.js',
        callees: ['className'],
      },
    },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-native/no-inline-styles': 'warn',

      // React Native requires require() for static image assets
      '@typescript-eslint/no-require-imports': 'off',

      // Guardrail 1: Ban Web DOM Primitives in React Native
      // Uses JSXOpeningElement > JSXIdentifier to specifically target element tags without triggering on props
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement > JSXIdentifier[name=/^(div|span|p|button|input|h1|h2|h3|h4|h5|h6|ul|li|ol|form|section|article|nav|aside|header|footer|table|tbody|thead|tr|td|th)$/]",
          message:
            '❌ [React Native Guardrail] Do not use web DOM elements in React Native. Use View, Text, Pressable, TextInput, etc. from "react-native".',
        },
      ],

      // Guardrail 2: Ban Expo Router & Navigation Frameworks (Role-based App.tsx invariant)
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-router',
              message:
                '❌ [Routing Guardrail] Role-based switching in frontend/App.tsx is the sole navigation invariant. Expo Router is strictly prohibited.',
            },
            {
              name: '@react-navigation/native',
              message:
                '❌ [Routing Guardrail] Use role-based state switching in App.tsx instead of react-navigation.',
            },
          ],
        },
      ],
    },
  },

  // 6. Guardrail 3: Strict Mock Isolation in Production Services
  {
    files: ['frontend/src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*mock*', '**/mock/**', '**/mockData*'],
              message:
                '❌ [Data Boundary Guardrail] Production API services must not import mock data. Types must come from @monks/shared, and real data from Supabase BaaS.',
            },
          ],
        },
      ],
    },
  }
);
