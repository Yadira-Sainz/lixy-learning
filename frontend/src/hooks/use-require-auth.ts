'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken, refreshTokenIfNeeded } from '@/lib/auth-client';

type RequireAuthState = {
  isChecking: boolean;
  isAuthorized: boolean;
};

export function useRequireAuth(): RequireAuthState {
  const router = useRouter();
  const [state, setState] = useState<RequireAuthState>({
    isChecking: true,
    isAuthorized: false,
  });

  useEffect(() => {
    const validateSession = async () => {
      const refreshed = await refreshTokenIfNeeded(false);
      const token = refreshed ?? getValidToken();
      if (!token) {
        setState({ isChecking: false, isAuthorized: false });
        router.replace('/auth?tab=login');
        return;
      }
      setState({ isChecking: false, isAuthorized: true });
    };

    void validateSession();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };
    const onFocus = () => validateSession();
    const onAuthChange = () => validateSession();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('auth-change', onAuthChange as EventListener);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('auth-change', onAuthChange as EventListener);
    };
  }, [router]);

  return state;
}

