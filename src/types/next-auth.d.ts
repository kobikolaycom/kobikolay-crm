import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string;
    isActive?: boolean;
    permissions?: string[];
  }

  interface Session {
    user: {
      id: string;
      role: string;
      isActive: boolean;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    isActive?: boolean;
    permissions?: string[];
  }
}
