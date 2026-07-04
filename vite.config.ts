import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022'
  },
  test: {
    include: ['src/**/*.test.ts']
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
