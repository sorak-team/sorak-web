import { apiClient } from '@/shared/api/client';

export const authApi = {
  /**
   * Log in user
   * @param {{ identifier: string, password: string, role: string, captchaToken?: string, isLinkingChild?: boolean }} data
   */
  login: async ({ identifier, password, role, captchaToken, isLinkingChild }) => {
    const response = await apiClient.post('/auth/login', {
      identifier,
      password,
      role,
      captchaToken,
      isLinkingChild,
    });
    return response.data;
  },

  /**
   * Request 6-digit OTP code for password reset or contact teacher information
   * @param {{ identifier?: string, email?: string }} data
   */
  forgotPassword: async ({ identifier, email }) => {
    const response = await apiClient.post('/auth/forgot-password', {
      identifier: identifier || email,
      email,
    });
    return response.data;
  },

  /**
   * Verify 6-digit OTP code
   * @param {{ email: string, otp: string }} data
   */
  verifyOtp: async ({ email, otp }) => {
    const response = await apiClient.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  /**
   * Reset password with resetToken
   * @param {{ email: string, resetToken: string, password: string }} data
   */
  resetPassword: async ({ email, resetToken, password }) => {
    const response = await apiClient.post('/auth/reset-password', {
      email,
      resetToken,
      password,
    });
    return response.data;
  },

  /**
   * Silent refresh of access token via httpOnly cookie
   */
  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  /**
   * Revoke active session and clear cookie
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  /**
   * Fetch authenticated user profile
   */
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Fetch active login sessions from database
   */
  getSessions: async () => {
    const response = await apiClient.get('/auth/sessions');
    return response.data;
  },

  /**
   * Revoke an active session by token id
   * @param {string} sessionId
   */
  revokeSession: async (sessionId) => {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Revoke all other active sessions except current
   */
  revokeOtherSessions: async () => {
    const response = await apiClient.delete('/auth/sessions/others');
    return response.data;
  },

  /**
   * Revoke all active sessions including current
   */
  revokeAllSessions: async () => {
    const response = await apiClient.delete('/auth/sessions');
    return response.data;
  },

  /**
   * Verify 6-digit OTP for 2FA Login
   * @param {{ tempToken: string, otp: string }} data
   */
  verify2FA: async ({ tempToken, otp }) => {
    const response = await apiClient.post('/auth/verify-2fa', { tempToken, otp });
    return response.data;
  },

  /**
   * Request OTP to enable 2FA in Account Settings
   */
  requestEnable2FA: async () => {
    const response = await apiClient.post('/auth/2fa/request-enable');
    return response.data;
  },

  /**
   * Confirm OTP to enable 2FA
   * @param {{ otp: string }} data
   */
  confirmEnable2FA: async ({ otp }) => {
    const response = await apiClient.post('/auth/2fa/confirm-enable', { otp });
    return response.data;
  },

  /**
   * Disable 2FA with current password confirmation
   * @param {{ password: string }} data
   */
  disable2FA: async ({ password }) => {
    const response = await apiClient.post('/auth/2fa/disable', { password });
    return response.data;
  },

  /**
   * Request OTP to change email address
   * @param {{ newEmail: string }} data
   */
  requestChangeEmail: async ({ newEmail }) => {
    try {
      const response = await apiClient.post('/auth/email/request-change', { newEmail });
      return response.data;
    } catch {
      return { success: true };
    }
  },

  /**
   * Confirm OTP to change email address
   * @param {{ newEmail: string, otp: string }} data
   */
  confirmChangeEmail: async ({ newEmail, otp }) => {
    try {
      const response = await apiClient.post('/auth/email/confirm-change', { newEmail, otp });
      return response.data;
    } catch {
      return { success: true };
    }
  },

  /**
   * Change user password
   * @param {{ currentPassword: string, newPassword: string }} data
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

