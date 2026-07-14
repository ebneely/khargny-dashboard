import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  let accessToken: string;
  let user: { id: string; email: string; role: string };

  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return NextResponse.json(
        { error: body?.message || "Invalid credentials" },
        { status: 401 },
      );
    }

    const data = await res.json();
    accessToken = data.access_token;
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    );
    user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // Dev fallback — when backend isn't running, accept test@khargny.com
    if (email !== "test@khargny.com" || password !== "admin123") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    user = { id: "dev-user", email, role: "super_admin" };
    accessToken = "dev." + Buffer.from(JSON.stringify({ sub: user.id, email: user.email, role: user.role })).toString("base64url") + ".fake-sig";
  }

  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24,
  };

  const response = NextResponse.json({ user });
  response.cookies.set("session_token", accessToken, { ...cookieOpts, httpOnly: true });
  response.cookies.set("token", accessToken, { ...cookieOpts, httpOnly: false });

  return response;
}
