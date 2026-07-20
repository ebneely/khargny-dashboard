import { cookies } from "next/headers";
import { cache } from "react";
import { API_BASE_URL } from "@/lib/config";

export interface DashboardSession {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: "super_admin" | "admin" | "viewer" | string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

interface MeBody {
  data?: {
    id: string;
    email: string;
    role: string;
    status: string;
  };
}

/**
 * The signed-in admin, read on the server.
 *
 * Calls the backend's /v1/auth/me DIRECTLY with the session cookie. It used to fetch this
 * app's own /api/auth/session over HTTP at `NEXT_PUBLIC_APP_URL || localhost:3000` — a
 * server-to-self round-trip that depends on that env var being set correctly in every
 * environment. When it wasn't, the fetch failed, the catch swallowed it, and the caller
 * received null. Since callers read `session?.user?.role`, a failed lookup is
 * indistinguishable from "not a super admin": the Admins tab and the Settings danger zone
 * silently vanished for super admins, and /dashboard/admins redirected them away.
 *
 * Failures are logged rather than swallowed silently, so the next one is diagnosable
 * instead of presenting as a permissions bug.
 */
export const getServerSession = cache(
  async (): Promise<DashboardSession | null> => {
    if (!API_BASE_URL) {
      console.error("[auth-server] NEXT_PUBLIC_API_URL is not set; cannot resolve session");
      return null;
    }

    const cookieStore = await cookies();
    const bearer =
      cookieStore.get("session_token")?.value || cookieStore.get("token")?.value;
    if (!bearer) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        // 401 is ordinary (expired token) — anything else is worth surfacing.
        if (response.status !== 401) {
          console.error(`[auth-server] /v1/auth/me returned ${response.status}`);
        }
        return null;
      }

      const body = (await response.json()) as MeBody;
      const profile = body?.data;
      if (!profile) {
        console.error("[auth-server] /v1/auth/me returned no data field");
        return null;
      }

      return {
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.role,
        },
        session: { id: profile.id, expiresAt: "" },
      };
    } catch (error) {
      console.error("[auth-server] session lookup failed:", error);
      return null;
    }
  },
);

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}
