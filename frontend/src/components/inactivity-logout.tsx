'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession, getValidToken } from '@/lib/auth-client';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const THROTTLE_MS = 1000; // Only count activity at most once per second (mousemove fires constantly)

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export default function InactivityLogout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const logout = useCallback(() => {
    clearAuthSession(false);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      router.push('/auth?tab=login');
    }
  }, [router]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(logout, INACTIVITY_MS);
  }, [logout]);

  useEffect(() => {
    const setupTimer = () => {
      const token = getValidToken();
      if (!token) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      lastActivityRef.current = Date.now();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(logout, INACTIVITY_MS);
    };

    const handleActivity = () => resetTimer();
    const handleAuthChange = () => setupTimer();
    const handleVisibilityOrFocus = () => {
      const token = getValidToken();
      if (!token && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        router.push('/auth?tab=login');
        return;
      }
      setupTimer();
    };

    setupTimer();

    ACTIVITY_EVENTS.forEach((ev) => {
      document.addEventListener(ev, handleActivity);
    });
    window.addEventListener('auth-change', handleAuthChange);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      ACTIVITY_EVENTS.forEach((ev) => {
        document.removeEventListener(ev, handleActivity);
      });
      window.removeEventListener('auth-change', handleAuthChange);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [resetTimer, logout, router]);

  return null;
}
