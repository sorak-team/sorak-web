import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth.store';

/**
 * Route guard for public-only pages (e.g., /login).
 * If the user is already authenticated, redirects them away to the dashboard.
 */
export function PublicOnlyRoute() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (user) {
    const isParent = user.role === 'PARENT_PH';
    let destination = isParent ? '/parent' : '/classes';
    if (location.state?.from?.pathname) {
      const fromPath = location.state.from.pathname;
      if (isParent && fromPath.startsWith('/parent')) {
        destination = fromPath;
      } else if (!isParent && !fromPath.startsWith('/parent') && fromPath !== '/' && fromPath !== '/login') {
        destination = fromPath;
      }
    }
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
