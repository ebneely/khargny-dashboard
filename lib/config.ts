export const ENV = process.env.NEXT_PUBLIC_ENV;
export const isProduction = ENV === "production";
export const isDevelopment = ENV === "development";

/**
 * Backend Base URL Configuration — single source of truth (khargny-backend).
 * Mirrors khargny-frontend/src/lib/config.ts.
 */
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

const normalizeUrl = (url: string) => url.replace(/\/$/, "");

// Scaffold phase: tolerate a missing env var at build time (no throw) so
// `next build`/`next dev` succeed before .env.local is configured. The
// auth guard below fails closed (redirects to /login) if this is unset.
export const BACKEND_URL = BACKEND_BASE_URL ? normalizeUrl(BACKEND_BASE_URL) : "";
export const BETTER_AUTH_URL = `${BACKEND_URL}/api/auth`;

/** REST API base URL (khargny-backend, prefix /v1). */
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const API_BASE_URL = API_URL ? normalizeUrl(API_URL) : "";

// This file: dashboard environment configuration for backend/API URLs.
