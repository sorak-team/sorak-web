import axios from 'axios';
import { useAuthStore } from '@/features/auth/auth.store';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30_000,
});

// Request Interceptor: Attach Bearer access token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
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
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);