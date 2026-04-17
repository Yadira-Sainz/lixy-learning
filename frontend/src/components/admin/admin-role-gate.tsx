'use client';

import type { ReactNode } from 'react';
import { useAdminAccess } from '@/hooks/use-admin-access';
import { Skeleton } from '@/components/ui/skeleton';

type AdminRoleGateProps = {
  children: ReactNode;
  /** Shown while checking admin status */
  loadingFallback?: ReactNode;
  /** Shown when user is not admin */
  deniedFallback?: ReactNode;
};

/**
 * Renders children only if /api/admin/me reports isAdmin.
 * Does not replace server-side checks on admin endpoints.
 */
export function AdminRoleGate({ children, loadingFallback, deniedFallback }: AdminRoleGateProps) {
  const { isAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      loadingFallback ?? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      )
    );
  }

  if (!isAdmin) {
    return deniedFallback ?? null;
  }

  return <>{children}</>;
}
