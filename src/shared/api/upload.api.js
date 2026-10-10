import { apiClient } from './client';

export const uploadApi = {
  /**
   * Upload and optimize avatar image via Multer + Sharp StorageService
   * @param {File} file - Selected image file
   * @returns {Promise<{ url: string, relativeUrl: string, size: number }>}
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data || response.data;
  },

  /**
   * Upload pickup authorization or parent photo to MinIO storage
   * @param {File} file - Selected image file
   * @returns {Promise<{ url: string, relativeUrl: string, size: number }>}
   */
  async uploadPickupPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/upload/pickup', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data || response.data;
  },
};

export default uploadApi;
