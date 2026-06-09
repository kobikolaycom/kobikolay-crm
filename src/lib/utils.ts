import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Get the base URL for the application.
 * Standardized across all services — single source of truth.
 */
export function getBaseUrl(): string {
  // Try to get host from request headers dynamically (Server side only)
  if (typeof window === "undefined") {
    try {
      const { headers } = require("next/headers");
      const host = headers().get("host");
      if (host) {
        const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        return `${protocol}://${host}`;
      }
    } catch {}
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}
