import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './__checks__',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
  },
})
