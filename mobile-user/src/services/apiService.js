import axios from 'axios';
import { storage } from '../lib/storage';
import { emit } from '../lib/events';


import { API_BASE_URL, REQUEST_TIMEOUT } from '../config';
import useFeatureFlagsStore from '../store/featureFlagsStore';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
});

// Interceptor to add Token and Log
api.interceptors.request.use((config) => {
  const token = storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor to handle 401 Unauthorized (Token invalid/expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const isBlocked = error.response?.data?.isBlocked;

    // Handle 413 or raw HTML responses from reverse proxies like Nginx
    if (status === 413 || (typeof error.response?.data === 'string' && error.response.data.includes('<html'))) {
      const existingMsg = typeof error.response?.data?.message === 'string' ? error.response.data.message : null;
      const message = existingMsg || 'Upload failed: File size exceeds the server upload limit (HTTP 413 Request Entity Too Large).';
      error.response = error.response || {};
      error.response.data = { message };
      error.message = message;
    }

    // Admin switched a feature off (or on) since this page loaded: resync flags and surface the server message
    const featureCode = error.response?.data?.code;
    if (featureCode === 'RAZORPAY_DISABLED' || featureCode === 'SUBSCRIPTION_DISABLED') {
      useFeatureFlagsStore.getState().fetchFlags();
      error.message = error.response.data.message || error.message;
    }

    if (status === 401 || (status === 403 && isBlocked)) {
      // Clear invalid token and redirect if not already on auth pages
      storage.removeItem('token');
      storage.removeItem('user');
      emit('session-expired', { blocked: !!isBlocked });
    }
    return Promise.reject(error);
  }
);

// User Auth Services
export const authService = {
  // Send OTP
  sendOtp: async (phone, type = 'login', role = 'user') => {
    try {
      const response = await api.post('/auth/send-otp', { phone, type, role });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify OTP & Login/Register
  verifyOtp: async (data) => {
    try {
      const response = await api.post('/auth/verify-otp', data);
      if (response.data.token) {
        storage.setItem('token', response.data.token);
        storage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify Partner OTP & Register
  verifyPartnerOtp: async (data) => {
    try {
      const response = await api.post('/auth/partner/verify-otp', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Initiate Partner Registration (Step 1 & 2)
  registerPartner: async (data) => {
    try {
      const response = await api.post('/auth/partner/register', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload Partner Docs
  uploadDocs: async (formData) => {
    try {
      const response = await api.post('/auth/partner/upload-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Partner Doc
  deleteDoc: async (publicId) => {
    try {
      const response = await api.post('/auth/partner/delete-doc', { publicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload Partner Docs via Base64 (Flutter Camera)
  uploadDocsBase64: async (images) => {
    try {
      const response = await api.post('/auth/partner/upload-docs-base64', { images });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update Profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/update-profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Account
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout - clears FCM tokens on server then clears local storage
  logout: async (platform = null) => {
    try {
      const token = storage.getItem('token');
      if (token) {
        await api.post('/users/logout', { platform }).catch(() => {});
      }
    } catch (e) {
      console.warn('Logout API call failed:', e);
    }
    storage.removeItem('token');
    storage.removeItem('user');
  }
};



// Booking Services
export const bookingService = {
  create: async (bookingData) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMyBookings: async (type) => {
    try {
      const url = type ? `/bookings/my?type=${type}` : '/bookings/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerBookings: async (status) => {
    try {
      const url = status ? `/bookings/partner?status=${status}` : '/bookings/partner';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getBookingDetail: async (id) => {
    try {
      const response = await api.get(`/bookings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerBookingDetail: async (id) => {
    try {
      const response = await api.get(`/bookings/${id}/partner-detail`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markAsPaid: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/mark-paid`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markNoShow: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/no-show`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  checkIn: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/check-in`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  checkOut: async (id, force = false) => {
    try {
      const url = force ? `/bookings/${id}/check-out?force=true` : `/bookings/${id}/check-out`;
      const response = await api.put(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateInquiryStatus: async (id, status, message) => {
    try {
      const response = await api.put(`/bookings/${id}/inquiry-status`, { status, message });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  cancel: async (bookingId, reason) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // extra: { sourceScreen, action: 'call_click', sharingType, ... } (see backend utils/leadTracker.js)
  recordViewLead: async (propertyId, extra = {}) => {
    try {
      const response = await api.post('/bookings/view-lead', { propertyId, platform: 'app', ...extra });
      return response.data;
    } catch (error) {
      console.warn('View lead record skipped/failed:', error?.message);
      return { success: false, error: error?.message };
    }
  }
};

// Property Services (New)
const publicListCache = new Map();

export const propertyService = {
  recordViewLead: async (propertyId, extra) => {
    return bookingService.recordViewLead(propertyId, extra);
  },
  createProperty: async (propertyData) => {
    try {
      // Ensure structureDetails is included if present
      const response = await api.post('/properties', propertyData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Alias for backward compatibility with wizards
  create: async (propertyData) => {
    return propertyService.createProperty(propertyData);
  },
  upsertDocuments: async (propertyId, documents) => {
    try {
      const response = await api.post(`/properties/${propertyId}/documents`, { documents });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/properties/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  publishDraft: async (id, data = {}) => {
    try {
      const response = await api.post(`/properties/${id}/publish`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  addRoomType: async (propertyId, data) => {
    try {
      const response = await api.post(`/properties/${propertyId}/room-types`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateRoomType: async (propertyId, roomTypeId, data) => {
    try {
      const response = await api.put(`/properties/${propertyId}/room-types/${roomTypeId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteRoomType: async (propertyId, roomTypeId) => {
    try {
      const response = await api.delete(`/properties/${propertyId}/room-types/${roomTypeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMy: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties/my?${params}` : '/properties/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Public listing (home sections, search). Home fires several of these at once: identical in-flight calls are shared, results cached for 20s.
  getPublicProperties: (params = {}) => {
    const key = JSON.stringify(params);
    const hit = publicListCache.get(key);
    if (hit && (hit.pending || Date.now() - hit.at < 20000)) return hit.promise;
    const entry = { at: Date.now(), pending: true, promise: null };
    entry.promise = api.get('/properties', { params })
      .then((r) => { entry.pending = false; entry.at = Date.now(); return r.data; })
      .catch((error) => { publicListCache.delete(key); throw error.response?.data || error.message; });
    publicListCache.set(key, entry);
    return entry.promise;
  },
  getPublic: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties?${params}` : '/properties';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Public partner profile (Top Rated Partners); listings via getPublic({ partner: id })
  getPartnerProfile: async (id) => {
    try {
      const response = await api.get(`/properties/partners/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getRecommendedSellers: async () => {
    try {
      const response = await api.get('/properties/recommended-sellers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getNewsArticles: async (params = {}) => {
    try {
      const response = await api.get('/news', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getDetails: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  revealContact: async (id, extra = {}) => {
    try {
      const response = await api.get(`/properties/${id}/reveal-contact`, { params: { platform: 'app', ...extra } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};


// Hotel Services (Updated)
export const hotelService = {
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties?${params}` : '/properties';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMyHotels: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties/my?${params}` : '/properties/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getCurrentLocation: async () => {
    try {
      const response = await api.get('/hotels/location/current');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadImages: async (formData) => {
    try {
      const response = await api.post('/hotels/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      if (error?.response?.status === 413 || (typeof error?.response?.data === 'string' && error.response.data.includes('<html'))) {
        throw new Error('Upload failed: File size exceeds the server limit (HTTP 413). Please choose a smaller photo.');
      }
      throw error.response?.data || error.message;
    }
  },
  uploadImagesBase64: async (images) => {
    try {
      const response = await api.post('/hotels/upload-base64', { images });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAddressFromCoordinates: async (lat, lng) => {
    try {
      const response = await api.post('/hotels/location/address', { lat, lng });
      return response.data;
    } catch (error) {
      const err = error.response?.data || { message: error.message };
      console.error('[getAddressFromCoordinates] Backend error:', err);
      throw err;
    }
  },
  saveOnboardingStep: async (data) => {
    try {
      const response = await api.post('/hotels/onboarding/save-step', data);
      return response.data;
    } catch (error) {
      console.warn("Draft Save Error:", error);
      if (error.response && error.response.status === 404) {
        const errObj = typeof error.response.data === 'object' ? { ...error.response.data } : { message: error.response.data };
        errObj.status = 404;
        throw errObj;
      }
      throw error.response?.data || error.message;
    }
  },
  searchLocation: async (query) => {
    try {
      const response = await api.get(`/hotels/location/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      const err = error.response?.data || { message: error.message };
      console.error('[searchLocation] Backend error:', err);
      throw err;
    }
  },
  calculateDistance: async (originLat, originLng, destLat, destLng) => {
    try {
      const response = await api.get(`/hotels/location/distance?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteHotel: async (id) => {
    try {
      const response = await api.delete(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Notification Methods for Partners
  getNotifications: async (page = 1, limit = 20) => {
    try {
      // /users/notifications uses the same controller as /hotels/notifications but is not role-gated to 'partner' (that 403s unified accounts)
      const response = await api.get(`/users/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markAllNotificationsRead: async () => {
    try {
      const response = await api.put('/users/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteNotifications: async (ids) => {
    try {
      const response = await api.delete('/users/notifications', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteImage: async (url, publicId) => {
    try {
      const response = await api.post('/hotels/delete-image', { url, publicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// User Profile Services
export const userService = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateProfile: async (data) => {
    try {
      const response = await api.put('/users/profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get Saved Hotels
  getSavedHotels: async () => {
    try {
      const response = await api.get('/users/saved-hotels');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Toggle Saved Hotel
  toggleSavedHotel: async (hotelId) => {
    try {
      const response = await api.post(`/users/saved-hotels/${hotelId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Update FCM Token
  updateFcmToken: async (fcmToken, platform = 'web') => {
    try {
      const response = await api.put('/users/fcm-token', { fcmToken, platform });
      return response.data;
    } catch (error) {
      console.warn('FCM Token Update Failed:', error);
      return null;
    }
  },

  // Send Test Notification
  sendTestNotification: async () => {
    try {
      const response = await api.post('/users/test-notification');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Notifications
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/users/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Notifications (Bulk)
  deleteNotifications: async (ids) => {
    try {
      // Use DELETE method with data body (supported by Axios)
      const response = await api.delete('/users/notifications', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark All Notifications Read
  markAllNotificationsRead: async () => {
    try {
      const response = await api.put('/users/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Offer & Coupon Services
export const offerService = {
  // Use by users to see available coupons
  getActive: async () => {
    try {
      const response = await api.get('/offers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Validate coupon before booking
  validate: async (code, bookingAmount) => {
    try {
      const response = await api.post('/offers/validate', { code, bookingAmount });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get all for admin management
  getAll: async () => {
    try {
      const response = await api.get('/offers/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Create new (Admin)
  create: async (offerData) => {
    try {
      const response = await api.post('/offers', offerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};



export const paymentService = {
  createOrder: async (bookingId) => {
    try {
      const response = await api.post('/payments/create-order', { bookingId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  verifyPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const legalService = {
  getPage: async (audience, slug) => {
    try {
      const response = await api.get(`/info/${audience}/${slug}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPlatformStatus: async () => {
    try {
      const response = await api.get('/info/platform/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getFinancialSettings: async () => {
    try {
      const response = await api.get('/info/platform/financials');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  submitContact: async (audience, payload) => {
    try {
      const response = await api.post(`/contact/${audience}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Availability & Inventory Services
export const availabilityService = {
  check: async (params) => {
    try {
      const response = await api.get('/availability/check', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createWalkIn: async (data) => {
    try {
      const response = await api.post('/availability/partner/walkin', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createExternal: async (data) => {
    try {
      const response = await api.post('/availability/partner/external-booking', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  blockDates: async (data) => {
    try {
      const response = await api.post('/availability/partner/block-inventory', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getLedger: async (params) => {
    try {
      const response = await api.get('/availability/partner/ledger', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const reviewService = {
  getPropertyReviews: async (propertyId) => {
    try {
      const response = await api.get(`/reviews/${propertyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createReview: async (reviewData) => {
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerStats: async () => {
    try {
      const response = await api.get('/reviews/partner/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAllPartnerReviews: async (status) => {
    try {
      const url = status ? `/reviews/partner/all?status=${status}` : '/reviews/partner/all';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  reply: async (reviewId, reply) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/reply`, { reply });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  toggleHelpful: async (reviewId) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/helpful`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const referralService = {
  getMyStats: async () => {
    try {
      const response = await api.get('/referrals/my-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getActiveProgram: async () => {
    try {
      const response = await api.get('/referrals/program/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const handleResponse = (response) => response.data;

export const handleError = (error) => {
  throw error.response?.data || error.message;
};

/* --- FAQ SERVICES --- */
export const faqService = {
  // Public - Get active FAQs for an audience
  getFaqs: async (audience) => {
    try {
      const response = await api.get(`/faqs?audience=${audience}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin - Get all FAQs
  getAllFaqsAdmin: async (audience) => {
    try {
      const response = await api.get(`/faqs/admin?audience=${audience}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createFaq: async (faqData) => {
    try {
      const response = await api.post('/faqs', faqData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateFaq: async (id, faqData) => {
    try {
      const response = await api.put(`/faqs/${id}`, faqData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteFaq: async (id) => {
    try {
      const response = await api.delete(`/faqs/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default api;
