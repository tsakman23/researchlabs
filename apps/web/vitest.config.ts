import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
    // Exclude Playwright E2E test files
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts', // Playwright E2E tests
      '**/.next/**'
    ],
    // Include only Vitest unit tests
    include: [
      '**/tests/unit/**/*.test.ts'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
