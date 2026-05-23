import type { NextAuthConfig } from "next-auth";

/**
 * NextAuth Configuration (Edge Compatible)
 * This file is used by middleware.ts which runs on the Edge runtime.
 * It does NOT include database adapters or Node-specific libraries (like bcrypt)
 * to ensure maximum performance and compatibility.
 */
export const authConfig = {
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname === "/login";

      // Allow all API routes to handle their own auth (or webhooks to bypass)
      if (isApiRoute) return true;

      // Redirect authenticated users away from login page
      if (isLoggedIn && isPublicRoute) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Allow public routes
      if (isPublicRoute) return true;

      // Require authentication for all other routes
      return isLoggedIn;
    },

    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.isActive = user.isActive;
        token.permissions = user.permissions;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.isActive = token.isActive as boolean;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
