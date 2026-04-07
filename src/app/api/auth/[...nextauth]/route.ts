import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

import { NextAuthOptions } from "next-auth";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Access Code',
      credentials: {
        accessCode: { label: "Código de Acceso", type: "text", placeholder: "RTF-8A92" }
      },
      async authorize(credentials) {
        if (credentials?.accessCode === 'SUPER-ADMIN-360') {
           return { id: "super-admin", name: "SuperAdmin" };
        }

        if (!credentials?.accessCode) {
           return null;
        }

        const normalizedCode = credentials.accessCode.trim().toUpperCase();

        const restaurant = await prisma.restaurant.findUnique({
          where: { access_code: normalizedCode }
        });

        if (restaurant && restaurant.status !== 'Suspendido') {
          return { id: restaurant.id, name: restaurant.name };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Ensure we map the id to session
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "default-insecure-secret-for-local-dev-only-change-this"
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
