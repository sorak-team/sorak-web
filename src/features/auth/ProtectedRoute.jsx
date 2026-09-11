import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth.store';
import { authApi } from './auth.api';

/**
 * Protects dashboard routes from unauthorized access.
 * - If user is logged in, renders the nested routes (<Outlet />).
 * - If user is not in state (e.g., fresh tab), attempts silent refresh via the persistent 7-day httpOnly cookie.
 * - If unauthenticated, redirects to /login with state.from set to the attempted location.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isChecking, setIsChecking] = useState(!user);

  useEffect(() => {
    let isMounted = true;

    // If already authenticated from localStorage, proceed immediately
    if (user) {
      setIsChecking(false);
      return;
    }

    // Try silent refresh using the persistent 7-day cookie
    authApi
      .refreshToken()
      .then(async (refreshRes) => {
        if (!isMounted) return;
        const token = refreshRes?.data?.accessToken || refreshRes?.accessToken;
        if (token) {
          try {
            const meRes = await authApi.getMe();
            const currentUser = meRes?.data?.user || meRes?.data || meRes?.user;
            if (currentUser && isMounted) {
              setAuth(currentUser, token);
              setIsChecking(false);
              return;
            }
          } catch {
            // Failed to fetch profile
          }
        }
        if (isMounted) setIsChecking(false);
      })
      .catch(() => {
        if (isMounted) setIsChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, setAuth]);

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Đang xác thực phiên đăng nhập...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
