import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ }]
        }
      }
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
