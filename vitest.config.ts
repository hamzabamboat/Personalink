import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const root = fileURLToPath(new URL('.', import.meta.url))

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
      'server-only': resolve(root, 'node_modules/server-only/empty.js'),
      // stub supabase-admin so pure-function tests don't require real env vars
      // (matches both relative './supabase-admin' and '@/lib/supabase-admin' paths)
      './supabase-admin': resolve(root, 'lib/__tests__/__mocks__/supabase-admin.ts'),
      '@/lib/supabase-admin': resolve(root, 'lib/__tests__/__mocks__/supabase-admin.ts'),
      // Next.js path alias — resolve @/ to the project root
      '@': root,
    },
  },
})
