'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const THROTTLE_MS = 1000; // Only count activity at most once per second (mousemove fires constantly)

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export default function InactivityLogout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: false } }));
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
      const token = localStorage.getItem('token');
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

    setupTimer();

    ACTIVITY_EVENTS.forEach((ev) => {
      document.addEventListener(ev, handleActivity);
    });
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      ACTIVITY_EVENTS.forEach((ev) => {
        document.removeEventListener(ev, handleActivity);
      });
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [resetTimer, logout]);

  return null;
}
