import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'frontend/src/**/__tests__/**/*.test.{ts,tsx}',
      'packages/*/src/**/__tests__/**/*.test.{ts,tsx}',
      'packages/*/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './frontend/src') },
      { find: '@monks/shared', replacement: path.resolve(__dirname, './packages/shared/src') },
      { find: '@monks/printing', replacement: path.resolve(__dirname, './packages/printing/src') },
      {
        find: /^react-native$/,
        replacement: path.resolve(__dirname, './frontend/src/test/shims/react-native.ts'),
      },
      {
        find: /^react-native-svg$/,
        replacement: path.resolve(__dirname, './frontend/src/test/shims/react-native-svg.ts'),
      },
    ],
  },
});
