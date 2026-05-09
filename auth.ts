import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase-admin'

console.log('[auth] GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID)
console.log('[auth] GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET)
console.log('[auth] AUTH_SECRET exists:', !!process.env.AUTH_SECRET)
console.log('[auth] NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)
console.log('[auth] NEXTAUTH_URL:', process.env.NEXTAUTH_URL)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // next-auth v5 reads AUTH_SECRET automatically; secret: field is a fallback
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Required for Vercel and any deployment behind a proxy
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider !== 'google') return true

        console.log('[auth] signIn callback — google provider, user:', user.email)

        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('google_id', account.providerAccountId)
          .maybeSingle()

        if (!existingUser) {
          const { error } = await supabaseAdmin.from('users').insert({
            google_id: account.providerAccountId,
            auth_provider: 'google',
            email: user.email,
            linkedin_name: user.name,
            linkedin_picture: user.image,
            updated_at: new Date().toISOString(),
          })
          if (error) {
            console.error('[auth] failed to insert user:', error.message)
            return false
          }
          console.log('[auth] new user inserted:', user.email)
        } else {
          console.log('[auth] existing user found:', existingUser.id)
        }
        return true
      } catch (err) {
        console.error('[auth] signIn error:', err)
        return false
      }
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/api/auth/google/callback`
    },
    async session({ session }) {
      return session
    },
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        token.googleId = account.providerAccountId
      }
      return token
    },
  },
})
