import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authConfig } from "../auth.config";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          console.log("[AUTH] Login attempt");
          
          try {
            const user = await prisma.user.findUnique({
              where: { email },
              include: { role: true }
            });

            if (!user) {
              console.log("[AUTH] User not found");
              return null;
            }

            console.log("[AUTH] User found, comparing passwords...");
            const passwordsMatch = await bcrypt.compare(password, user.password);

            if (passwordsMatch) {
              if (!user.isActive) {
                console.log("[AUTH] User is deactivated");
                return null;
              }
              console.log("[AUTH] Login successful");
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.name,
                isActive: user.isActive,
                permissions: user.role.permissions,
              };
            } else {
              console.log("[AUTH] Password mismatch");
            }
          } catch (error) {
            console.error("[AUTH] Database error during login:", error);
            // Re-throw or return null to trigger CredentialsSignin
          }
        }
        
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
});
