'use client';

import { useCallback, useEffect, useState } from 'react';
import { authFetch, getValidToken } from '@/lib/auth-client';

/**
 * Whether the logged-in user is allowed to access /api/admin/* (server allowlist).
 */
export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
    const backend = typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
    const token = getValidToken();
    if (!backend || !token) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch(`${backend}/api/admin/me`);
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const data = (await res.json()) as { isAdmin?: boolean };
      setIsAdmin(Boolean(data.isAdmin));
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isAdmin, loading, refresh };
}
