import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/music/**', 'src/storage/**', 'src/shared/**'],
      exclude: ['src/discord/**']
    }
  }
});
