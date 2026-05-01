/**
 * AWS Cognito client for LixyLearning.
 * Uses amazon-cognito-identity-js for authentication.
 * When NEXT_PUBLIC_USE_COGNITO is not "true", all functions no-op and return false.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const USE_COGNITO =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_COGNITO === "true";

const poolData = () => ({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
});

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool | null {
  if (!USE_COGNITO || !poolData().UserPoolId || !poolData().ClientId) {
    return null;
  }
  if (!userPool) {
    userPool = new CognitoUserPool(poolData());
  }
  return userPool;
}

export function isCognitoEnabled(): boolean {
  return USE_COGNITO && !!getUserPool();
}

/**
 * Sign in with email and password.
 * Returns the Id Token on success, or throws with error message.
 */
export function signIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      reject(new Error("Cognito is not configured"));
      return;
    }

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        resolve(idToken);
      },
      onFailure: (err) => {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "UserNotFoundException"
            ? "Usuario no encontrado"
            : e.code === "NotAuthorizedException"
              ? "Contraseña incorrecta"
              : e.message || "Error al iniciar sesión";
        reject(new Error(msg));
      },
    });
  });
}

export interface SignUpAttributes {
  given_name?: string;
  family_name?: string;
}

/**
 * Sign up with email and password.
 * Triggers email verification. Resolves with the CognitoUser on success.
 */
export function signUp(
  email: string,
  password: string,
  attributes: SignUpAttributes = {}
): Promise<{ user: CognitoUser; userSub: string }> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      reject(new Error("Cognito is not configured"));
      return;
    }

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    if (attributes.given_name) {
      attributeList.push(
        new CognitoUserAttribute({ Name: "given_name", Value: attributes.given_name })
      );
    }
    if (attributes.family_name) {
      attributeList.push(
        new CognitoUserAttribute({ Name: "family_name", Value: attributes.family_name })
      );
    }

    pool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "UsernameExistsException"
            ? "El correo ya está registrado"
            : e.message || "Error al registrarse";
        reject(new Error(msg));
        return;
      }
      if (!result?.user) {
        reject(new Error("Error al crear usuario"));
        return;
      }
      resolve({
        user: result.user,
        userSub: result.userSub || "",
      });
    });
  });
}

/**
 * Confirm sign up with the verification code sent to email.
 */
export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      reject(new Error("Cognito is not configured"));
      return;
    }
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: pool,
    });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "CodeMismatchException"
            ? "Código de verificación incorrecto"
            : e.message || "Error al verificar";
        reject(new Error(msg));
        return;
      }
      resolve();
    });
  });
}

const PKCE_VERIFIER_KEY = "cognito_pkce_verifier";
const PKCE_STATE_KEY = "cognito_pkce_state";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Base64Url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function hostedUiBaseUrl(): string | null {
  const prefix = (process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "").trim();
  const region = (process.env.NEXT_PUBLIC_COGNITO_REGION || "").trim();
  if (!prefix || !region) {
    return null;
  }
  return `https://${prefix}.auth.${region}.amazoncognito.com`;
}

/**
 * True when Cognito Hosted UI OAuth can be used (domain prefix, region, client id, callback URL).
 */
export function isOAuthConfigured(): boolean {
  if (!isCognitoEnabled()) {
    return false;
  }
  const redirect = (process.env.NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI || "").trim();
  if (!redirect || !hostedUiBaseUrl()) {
    return false;
  }
  return true;
}

export type OAuthProviderId = "google" | "microsoft";

function cognitoIdentityProviderName(provider: OAuthProviderId): string {
  if (provider === "google") {
    return (process.env.NEXT_PUBLIC_COGNITO_IDP_GOOGLE || "Google").trim();
  }
  return (process.env.NEXT_PUBLIC_COGNITO_IDP_MICROSOFT || "Microsoft").trim();
}

/**
 * Starts Cognito Hosted UI OAuth (PKCE): stores verifier/state and redirects the browser.
 * Only call in the browser.
 */
export async function startOAuthRedirect(provider: OAuthProviderId): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("OAuth must be started in the browser");
  }
  const base = hostedUiBaseUrl();
  const clientId = (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "").trim();
  const redirectUri = (process.env.NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI || "").trim();
  if (!base || !clientId || !redirectUri) {
    throw new Error("OAuth is not fully configured");
  }

  const verifier = randomVerifier();
  const challenge = await sha256Base64Url(verifier);
  const state = randomState();
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const idp = cognitoIdentityProviderName(provider);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid email profile",
    code_challenge: challenge,
    code_challenge_method: "S256",
    identity_provider: idp,
  });

  window.location.assign(`${base}/oauth2/authorize?${params.toString()}`);
}

/**
 * Decode Cognito Id token payload (JWT) without verifying signature — use only after server exchange.
 * Uses UTF-8 decoding so names with accents (e.g. from Google) do not break JSON.parse.
 */
export function decodeIdTokenPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }
  const segment = parts[1];
  const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = new TextDecoder("utf-8").decode(bytes);
  return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Attempts to obtain a fresh Cognito Id token from the current browser session.
 * Returns null when no refresh path is available.
 */
export function refreshCognitoSessionToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const pool = getUserPool();
    if (!pool) {
      resolve(null);
      return;
    }

    const user = pool.getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }

    user.getSession((err: Error | null, session: any) => {
      if (err || !session) {
        resolve(null);
        return;
      }

      if (session.isValid()) {
        resolve(session.getIdToken().getJwtToken());
        return;
      }

      const refreshToken = session.getRefreshToken();
      if (!refreshToken) {
        resolve(null);
        return;
      }

      user.refreshSession(refreshToken, (refreshErr: Error | null, refreshedSession: any) => {
        if (refreshErr || !refreshedSession) {
          resolve(null);
          return;
        }
        resolve(refreshedSession.getIdToken().getJwtToken());
      });
    });
  });
}
