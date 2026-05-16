import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

declare module 'next-auth' {
  interface User { id: string; role: string }
  interface Session { user: { id: string; role: string; email: string; name: string } }
}
declare module 'next-auth/jwt' {
  interface JWT { id: string; role: string }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',       type: 'email'    },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const sql = getDb();
        const rows = await sql`
          SELECT id, email, password_hash, nom, prenom, role
          FROM users
          WHERE email = ${credentials.email}
          LIMIT 1
        `;

        if (rows.length === 0) return null;
        const user = rows[0];

        const valid = await bcrypt.compare(credentials.password, user.password_hash as string);
        if (!valid) return null;

        return {
          id:    String(user.id),
          email: user.email as string,
          name:  `${user.prenom} ${user.nom}`,
          role:  user.role as string,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages:   { signIn: '/login' },
  secret:  process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  debug:   process.env.NODE_ENV === 'development',
};
