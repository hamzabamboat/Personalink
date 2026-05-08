import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase-admin'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('google_id', account.providerAccountId)
        .maybeSingle()

      if (!existingUser) {
        await supabaseAdmin.from('users').insert({
          google_id: account.providerAccountId,
          auth_provider: 'google',
          email: user.email,
          linkedin_name: user.name,
          linkedin_picture: user.image,
          updated_at: new Date().toISOString(),
        })
      }
      return true
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
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
