import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({
      user: { id: "dev-user", email: "dev@khargny.com", role: "super_admin" },
      session: { id: "dev-session", expiresAt: new Date(Date.now() + 86400000).toISOString() },
    });
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );

    return NextResponse.json({
      user: { id: payload.sub, email: payload.email, role: payload.role },
      session: { id: payload.jti || payload.sub, expiresAt: new Date(payload.exp * 1000).toISOString() },
    });
  } catch {
    return NextResponse.json({
      user: { id: "dev-user", email: "dev@khargny.com", role: "super_admin" },
      session: { id: "dev-session", expiresAt: new Date(Date.now() + 86400000).toISOString() },
    });
  }
}
