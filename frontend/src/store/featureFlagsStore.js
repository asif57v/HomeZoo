import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';
import { getSocket } from '../utils/socket';

export const RAZORPAY_UNAVAILABLE_MESSAGE = 'Online payments are temporarily unavailable. Please try again later.';

/**
 * Global feature switches managed by the admin (Platform Feature Controls).
 * Uses real-time WebSocket (Socket.io) push updates instead of periodic API polling.
 */
const useFeatureFlagsStore = create((set, get) => ({
  subscriptionEnabled: true,
  razorpayEnabled: true,
  phonepeHostelFeesEnabled: true,
  loaded: false,

  setFlags: (flags) =>
    set((state) => ({
      subscriptionEnabled: typeof flags.subscriptionEnabled === 'boolean' ? flags.subscriptionEnabled : state.subscriptionEnabled,
      razorpayEnabled: typeof flags.razorpayEnabled === 'boolean' ? flags.razorpayEnabled : state.razorpayEnabled,
      phonepeHostelFeesEnabled: typeof flags.phonepeHostelFeesEnabled === 'boolean' ? flags.phonepeHostelFeesEnabled : state.phonepeHostelFeesEnabled,
      loaded: true
    })),

  // Initial fetch on app start as an instant fallback
  fetchFlags: async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/info/platform/features`, { timeout: 15000 });
      get().setFlags(data);
    } catch (error) {
      set({ loaded: true });
    }
  },

  // Real-time WebSocket connection to receive instant push updates without polling
  initWebSocket: () => {
    try {
      const socket = getSocket();

      socket.on('connect', () => {
        // Request latest flags immediately upon connection
        socket.emit('get_feature_flags');
      });

      socket.on('feature_flags_updated', (flags) => {
        if (flags && typeof flags === 'object') {
          get().setFlags(flags);
        }
      });
    } catch (err) {
      console.warn('Socket.IO initialization error in featureFlagsStore:', err);
    }
  }
}));

// Initialize real-time WebSocket listener
useFeatureFlagsStore.getState().initWebSocket();

export const useFeatureFlags = () => useFeatureFlagsStore(useShallow((s) => ({
  subscriptionEnabled: s.subscriptionEnabled,
  razorpayEnabled: s.razorpayEnabled,
  phonepeHostelFeesEnabled: s.phonepeHostelFeesEnabled,
  loaded: s.loaded
})));

export default useFeatureFlagsStore;
