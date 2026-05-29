// Vitest mock — supabaseAdmin is not used in the pure-function tests.
// Any test that exercises DB functions will need a proper integration setup.
export const supabaseAdmin = {} as ReturnType<typeof import('@supabase/supabase-js').createClient>
