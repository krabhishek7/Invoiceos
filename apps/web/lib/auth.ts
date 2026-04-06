import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@invoiceos/db";

const nextAuth: NextAuthResult = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findFirst({
          where: { email },
          include: { org: true },
        });

        if (!user || !user.authProviderId) return null;

        const isValid = await compare(password, user.authProviderId);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId,
          role: user.role,
          orgName: user.org.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          orgId: string;
          role: string;
          orgName: string;
        };
        token.userId = u.id;
        token.orgId = u.orgId;
        token.role = u.role;
        token.orgName = u.orgName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        const s = session as unknown as Record<string, unknown>;
        s.orgId = token.orgId as string;
        s.role = token.role as string;
        s.orgName = token.orgName as string;
      }
      return session;
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
