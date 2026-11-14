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
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@monks/shared': path.resolve(__dirname, './packages/shared/src'),
      '@monks/printing': path.resolve(__dirname, './packages/printing/src'),
    },
  },
});
