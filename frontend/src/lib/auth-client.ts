export const TOKEN_STORAGE_KEY = "token";

const EXPIRY_SKEW_SECONDS = 30;
const REFRESH_WINDOW_SECONDS = 5 * 60;
const SESSION_EXPIRED_ERROR = "Session expired";

type JwtPayload = {
  exp?: number;
  token_use?: string;
  iss?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isLikelyCognitoToken(payload: JwtPayload | null): boolean {
  if (!payload) return false;
  if (payload.token_use === "id") return true;
  return typeof payload.iss === "string" && payload.iss.includes("cognito-idp.");
}

function secondsUntilExpiry(token: string): number {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return -1;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now;
}

let refreshInFlight: Promise<string | null> | null = null;

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearAuthSession(redirectToLogin = true): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("auth-change", { detail: { loggedIn: false } }));
  if (redirectToLogin && !window.location.pathname.startsWith("/auth")) {
    window.location.assign("/auth?tab=login");
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + EXPIRY_SKEW_SECONDS;
}

export function getValidToken(): string | null {
  const token = getStoredToken();
  if (!token) {
    return null;
  }
  if (isTokenExpired(token)) {
    clearAuthSession(false);
    return null;
  }
  return token;
}

async function refreshWithBackend(token: string): Promise<string | null> {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backend) {
    return null;
  }
  try {
    const response = await fetch(`${backend}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { token?: string };
    if (!data.token) {
      return null;
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    window.dispatchEvent(new CustomEvent("auth-change", { detail: { loggedIn: true } }));
    return data.token;
  } catch {
    return null;
  }
}

export async function refreshTokenIfNeeded(force = false): Promise<string | null> {
  const currentToken = getStoredToken();
  if (!currentToken) {
    return null;
  }
  const ttl = secondsUntilExpiry(currentToken);
  if (!force && ttl > REFRESH_WINDOW_SECONDS) {
    return currentToken;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const payload = decodeJwtPayload(currentToken);

    if (isLikelyCognitoToken(payload)) {
      try {
        const { refreshCognitoSessionToken } = await import("@/lib/cognito");
        const refreshed = await refreshCognitoSessionToken();
        if (refreshed) {
          localStorage.setItem(TOKEN_STORAGE_KEY, refreshed);
          window.dispatchEvent(new CustomEvent("auth-change", { detail: { loggedIn: true } }));
          return refreshed;
        }
      } catch {
        // Fall through to backend refresh attempt.
      }
    }

    return refreshWithBackend(currentToken);
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const maybeRefreshed = await refreshTokenIfNeeded(false);
  const token = maybeRefreshed ?? getValidToken();
  if (!token) {
    clearAuthSession();
    throw new Error(SESSION_EXPIRED_ERROR);
  }

  const withTokenHeaders = (value: string) => {
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${value}`);
    return headers;
  };

  let response = await fetch(input, { ...init, headers: withTokenHeaders(token) });
  if (response.status === 401 || response.status === 403) {
    const retriedToken = await refreshTokenIfNeeded(true);
    if (retriedToken && retriedToken !== token) {
      response = await fetch(input, { ...init, headers: withTokenHeaders(retriedToken) });
      if (response.status !== 401 && response.status !== 403) {
        return response;
      }
    }
    clearAuthSession();
    throw new Error(SESSION_EXPIRED_ERROR);
  }

  return response;
}
