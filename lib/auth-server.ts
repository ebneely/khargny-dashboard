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

      return await response.json();
    } catch {
      return null;
    }
  },
);

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}
