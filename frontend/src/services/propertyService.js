import { api, handleResponse, handleError } from './apiService';

export const propertyService = {
  getPublicProperties: async (params) => {
    try {
      const response = await api.get('/properties', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getPropertyDetails: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  recordViewLead: async (propertyId) => {
    try {
      const response = await api.post('/bookings/view-lead', { propertyId });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Helper to get location
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          }
        );
      }
    });
  }
};
