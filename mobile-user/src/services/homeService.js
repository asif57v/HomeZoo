import { api } from './apiService';

export const homeService = {
  getHomeData: async (city = '') => {
    try {
      const params = {};
      if (city) params.city = city;
      const response = await api.get('/home', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch home data:', error);
      return null;
    }
  }
};

export default homeService;
