import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

// Middleware sadece edge-compatible olan authConfig'i kullanır.
// Prisma ve bcrypt gibi ağır kütüphaneleri IMPORT ETMEZ.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
