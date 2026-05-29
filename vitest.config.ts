import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
    // server-only throws in non-Next.js environments (it guards against client
    // bundle inclusion). Stub it out for vitest — Next.js itself enforces the
    // real guard at build/bundle time.
    server: {
      deps: {
        inline: ['server-only'],
      },
    },
    alias: {
      'server-only': '/Users/hamza/Personalink/node_modules/server-only/empty.js',
      // stub supabase-admin so pure-function tests don't require real env vars
      './supabase-admin': '/Users/hamza/Personalink/lib/__tests__/__mocks__/supabase-admin.ts',
    },
  },
})
