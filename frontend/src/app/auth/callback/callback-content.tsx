"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { decodeIdTokenPayload } from "@/lib/cognito";
import { useLocale } from "@/contexts/locale-context";

function generateUsername(email: string) {
  const base = email.split("@")[0] || "user";
  return base + Math.floor(Math.random() * 10000);
}

function namesFromPayload(payload: Record<string, unknown>, email: string) {
  const given = typeof payload.given_name === "string" ? payload.given_name : "";
  const family = typeof payload.family_name === "string" ? payload.family_name : "";
  const name = typeof payload.name === "string" ? payload.name : "";
  let firstName = given;
  let lastName = family;
  if (!firstName && name) {
    const parts = name.trim().split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  }
  if (!firstName) {
    firstName = email.split("@")[0] || "Usuario";
  }
  if (!lastName) {
    lastName = "";
  }
  return { firstName, lastName };
}

/** One in-flight OAuth completion per authorization code (React Strict Mode / double mount). */
const oauthByCode = new Map<string, Promise<void>>();

function formatOAuthError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: unknown };
    if (typeof d.detail === "string") {
      return d.detail;
    }
    if (Array.isArray(d.detail)) {
      return JSON.stringify(d.detail);
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

export default function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

    const oauthError = searchParams.get("error");
    const oauthDesc = searchParams.get("error_description");
    if (oauthError) {
      setMessage(oauthDesc || oauthError);
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      setMessage(t("auth.oauthMissingParams"));
      return;
    }

    if (!backend) {
      setMessage(
        "NEXT_PUBLIC_BACKEND_URL no está configurado. Reconstruye el frontend con la URL del API en el .env."
      );
      return;
    }

    let p = oauthByCode.get(code);
    if (!p) {
      p = (async () => {
        const verifier = sessionStorage.getItem("cognito_pkce_verifier");
        const savedState = sessionStorage.getItem("cognito_pkce_state");
        if (!verifier || state !== savedState) {
          throw new Error(t("auth.oauthInvalidSession"));
        }

        const redirectUri = (process.env.NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI || "").trim();
        if (!redirectUri) {
          throw new Error(t("auth.oauthNotConfigured"));
        }

        sessionStorage.removeItem("cognito_pkce_verifier");
        sessionStorage.removeItem("cognito_pkce_state");

        let idToken: string;
        try {
          const exchange = await axios.post(`${backend}/api/cognito/oauth-exchange`, {
            code,
            code_verifier: verifier,
            redirect_uri: redirectUri,
          });
          const raw = exchange.data?.id_token;
          if (typeof raw !== "string" || !raw) {
            throw new Error(t("auth.oauthNoToken"));
          }
          idToken = raw;
        } catch (e: unknown) {
          if (axios.isAxiosError(e)) {
            throw new Error(formatOAuthError(e, t("auth.oauthFailed")));
          }
          throw e;
        }

        let payload: Record<string, unknown>;
        try {
          payload = decodeIdTokenPayload(idToken);
        } catch {
          throw new Error(t("auth.oauthNoToken"));
        }

        const preferred =
          typeof payload.preferred_username === "string" ? payload.preferred_username : "";
        const upn = typeof payload.upn === "string" ? payload.upn : "";
        const email =
          (typeof payload.email === "string" && payload.email) ||
          (typeof payload["cognito:username"] === "string" &&
          payload["cognito:username"].includes("@")
            ? payload["cognito:username"]
            : "") ||
          (preferred.includes("@") ? preferred : "") ||
          (upn.includes("@") ? upn : "") ||
          "";
        if (!email) {
          throw new Error(t("auth.oauthNoEmail"));
        }

        const { firstName, lastName } = namesFromPayload(payload, email);
        const username = generateUsername(email);

        const langsRes = await axios.get(`${backend}/languages`);
        const languages = langsRes.data as { language_id: number }[];
        const nativeLanguage = languages[0]?.language_id ?? 1;
        const learningLanguage = languages[1]?.language_id ?? nativeLanguage;

        try {
          await axios.post(
            `${backend}/api/cognito/sync-profile`,
            {
              username,
              first_name: firstName,
              last_name: lastName,
              native_language: nativeLanguage,
              learning_language: learningLanguage,
            },
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
        } catch (e: unknown) {
          if (axios.isAxiosError(e)) {
            throw new Error(formatOAuthError(e, t("auth.oauthFailed")));
          }
          throw e;
        }

        try {
          localStorage.setItem("token", idToken);
        } catch {
          /* private mode / quota */
        }
        window.dispatchEvent(new CustomEvent("auth-change", { detail: { loggedIn: true } }));
        try {
          router.replace("/tablero");
        } catch {
          window.location.href = "/tablero";
        }
      })();

      oauthByCode.set(code, p);
      p.finally(() => {
        oauthByCode.delete(code);
      });
    }

    if (p) {
      void p.then(
        () => {},
        (err: unknown) => {
          try {
            setMessage(formatOAuthError(err, t("auth.oauthFailed")));
          } catch {
            setMessage(t("auth.oauthFailed"));
          }
        }
      );
    }
  }, [searchParams, router, t]);

  if (!message) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">{t("auth.oauthCompleting")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <p className="text-center text-red-600 text-sm max-w-md">{message}</p>
      <button
        type="button"
        className="text-primary underline"
        onClick={() => router.replace("/auth")}
      >
        {t("auth.backToLogin")}
      </button>
    </div>
  );
}
