'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    const token = localStorage.getItem('token');
    if (!token) {
      setState({ isChecking: false, isAuthorized: false });
      router.replace('/auth?tab=login');
      return;
    }
    setState({ isChecking: false, isAuthorized: true });
  }, [router]);

  return state;
}

