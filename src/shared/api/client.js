import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/auth.store';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30_000,
});

// Ensure common defaults do not leak stale Authorization across user accounts
delete apiClient.defaults.headers.common.Authorization;

// Request Interceptor: Attach Bearer access token dynamically from active auth store
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Handle 401 & Silent Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const sanitizeBrMessage = (msg) => {
  if (typeof msg !== 'string') return msg;
  return msg
    .replace(/\s*\([A-Z]*\s*BR[-_ ]?\d+[^)]*\)/gi, '')
    .replace(/\s*\[[A-Z]*\s*BR[-_ ]?\d+[^\]]*\]/gi, '')
    .replace(/Theo quy định BR[-_ ]?\d+,\s*/gi, 'Theo quy định, ')
    .replace(/quy định BR[-_ ]?\d+/gi, 'quy định')
    .replace(/\bBR[-_]\d+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

apiClient.interceptors.response.use(
  (response) => {
    if (response?.data?.message && typeof response.data.message === 'string') {
      response.data.message = sanitizeBrMessage(response.data.message);
    }
    return response;
  },
  async (error) => {
    if (error?.response?.data?.message && typeof error.response.data.message === 'string') {
      error.response.data.message = sanitizeBrMessage(error.response.data.message);
    }
    if (Array.isArray(error?.response?.data?.details)) {
      error.response.data.details = error.response.data.details.map((d) =>
        d && typeof d === 'object' && d.message
          ? { ...d, message: sanitizeBrMessage(d.message) }
          : d,
      );
    }
    const originalRequest = error.config;

    if (
      error.response?.data?.code === 'ROLE_CHANGED' ||
      error.response?.data?.message?.includes('Vai trò tài khoản của bạn đã thay đổi')
    ) {
      const msg =
        error.response?.data?.message ||
        'Vai trò tài khoản của bạn đã thay đổi. Vui lòng đăng nhập lại.';
      sessionStorage.setItem('sorak_auth_notice', msg);
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=role_changed';
      } else {
        toast.warning(msg, { id: 'role-changed-toast', duration: 6000 });
      }
      return Promise.reject(error);
    }

    if (
      error.response?.data?.code === 'ACCOUNT_LOCKED' ||
      error.response?.data?.message?.includes('tạm khóa')
    ) {
      const msg =
        error.response?.data?.message ||
        'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ ban quản trị.';
      sessionStorage.setItem('sorak_auth_notice', msg);
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=account_locked';
      } else {
        toast.error(msg, { id: 'account-locked-toast', duration: 6000 });
      }
      return Promise.reject(error);
    }

    if (
      error.response?.data?.code === 'PASSWORD_CHANGED' ||
      error.response?.data?.message?.includes('Mật khẩu của bạn đã được thay đổi') ||
      error.response?.data?.message?.includes('Mật khẩu đã được thay đổi')
    ) {
      const msg =
        error.response?.data?.message ||
        'Mật khẩu của bạn đã được thay đổi. Vui lòng đăng nhập lại bằng mật khẩu mới.';
      sessionStorage.setItem('sorak_auth_notice', msg);
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=password_changed';
      } else {
        toast.warning(msg, { id: 'password-changed-toast', duration: 6000 });
      }
      return Promise.reject(error);
    }

    if (
      error.response?.data?.code === 'SESSION_REVOKED' ||
      error.response?.data?.message?.includes('Phiên đăng nhập đã bị vô hiệu')
    ) {
      const msg =
        error.response?.data?.message ||
        'Phiên đăng nhập đã bị vô hiệu hóa hoặc đăng xuất từ thiết bị khác. Vui lòng đăng nhập lại.';
      sessionStorage.setItem('sorak_auth_notice', msg);
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=session_revoked';
      } else {
        toast.warning(msg, { id: 'session-revoked-toast', duration: 6000 });
      }
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints (login, refresh, forgot-password, etc.)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newAccessToken = data.data?.accessToken;
        if (newAccessToken) {
          useAuthStore.getState().setAccessToken(newAccessToken);
          delete apiClient.defaults.headers.common.Authorization;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        delete apiClient.defaults.headers.common.Authorization;
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);