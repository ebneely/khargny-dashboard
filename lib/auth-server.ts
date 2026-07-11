import { headers } from "next/headers";
import { cache } from "react";
import { BACKEND_URL } from "./config";

/**
 * Server-Side Authentication Utility (adapted from khargny-frontend's
 * lib/auth-server.ts guard shape — REST-only, no GraphQL data calls here).
 *
 * ARCHITECTURE:
 * - Session lives on the backend (Better Auth), HttpOnly cookies.
 * - Auth decisions happen server-side only — never gate rendering on a
 *   client-fetched session (see khargny-frontend's useAuthSession warning).
 */

export interface DashboardSession {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: "super_admin" | "editor" | "viewer" | string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

export const getServerSession = cache(
  async (): Promise<DashboardSession | null> => {
    if (!BACKEND_URL) return null;

    try {
      const headersList = await headers();
      const cookieHeader = headersList.get("cookie") || "";

      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: "GET",
        headers: { cookie: cookieHeader },
        cache: "no-store",
      });

      if (!response.ok) return null;

      const session = await response.json();
      return session?.user ? (session as DashboardSession) : null;
    } catch {
      return null;
    }
  },
);

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}

// This file: server-side session lookup for the dashboard auth guard.
