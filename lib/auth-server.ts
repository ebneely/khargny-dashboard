import { headers } from "next/headers";
import { cache } from "react";

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
    try {
      const headersList = await headers();
      const cookieHeader = headersList.get("cookie") || "";

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/session`, {
        method: "GET",
        headers: { cookie: cookieHeader },
        cache: "no-store",
      });

      if (!response.ok) return null;

      // /api/auth/session answers { success, data: { user, session } }. Returning the body
      // as-is left session.user undefined, so `role === 'super_admin'` was never true and
      // the Admins tab was hidden from super admins too. Accept both shapes so a future
      // change to the envelope can't silently re-break authorization UI.
      const body = await response.json();
      return (body?.data ?? body) as DashboardSession;
    } catch {
      return null;
    }
  },
);

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}
