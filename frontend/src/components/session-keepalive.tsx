"use client";

import { useEffect } from "react";
import { getStoredToken, refreshTokenIfNeeded } from "@/lib/auth-client";

const REFRESH_CHECK_MS = 60 * 1000;

export default function SessionKeepAlive() {
  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      if (!mounted) return;
      if (document.visibilityState !== "visible") return;
      if (!getStoredToken()) return;
      await refreshTokenIfNeeded(false);
    };

    const timer = window.setInterval(() => {
      void tick();
    }, REFRESH_CHECK_MS);

    const onFocus = () => {
      void tick();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void tick();
      }
    };
    const onAuthChange = () => {
      void tick();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("auth-change", onAuthChange as EventListener);
    void tick();

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("auth-change", onAuthChange as EventListener);
    };
  }, []);

  return null;
}
