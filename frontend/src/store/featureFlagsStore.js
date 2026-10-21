import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

export const RAZORPAY_UNAVAILABLE_MESSAGE = 'Online payments are temporarily unavailable. Please try again later.';

/**
 * Global feature switches managed by the admin (Platform Feature Controls).
 * One store is shared by the User App, Hotel Panel and Admin Panel so they can never disagree.
 * Defaults are "enabled" until the first response; the backend enforces the real rule regardless.
 */
const useFeatureFlagsStore = create((set) => ({
  subscriptionEnabled: true,
  razorpayEnabled: true,
  loaded: false,

  setFlags: (flags) =>
    set((state) => ({
      subscriptionEnabled: typeof flags.subscriptionEnabled === 'boolean' ? flags.subscriptionEnabled : state.subscriptionEnabled,
      razorpayEnabled: typeof flags.razorpayEnabled === 'boolean' ? flags.razorpayEnabled : state.razorpayEnabled,
      loaded: true
    })),

  fetchFlags: async () => {
    try {
      // Plain axios on purpose: public endpoint, and keeps the shared api interceptors out of this call
      const { data } = await axios.get(`${API_BASE_URL}/info/platform/features`, { timeout: 15000 });
      set((state) => ({
        subscriptionEnabled: typeof data.subscriptionEnabled === 'boolean' ? data.subscriptionEnabled : state.subscriptionEnabled,
        razorpayEnabled: typeof data.razorpayEnabled === 'boolean' ? data.razorpayEnabled : state.razorpayEnabled,
        loaded: true
      }));
    } catch (error) {
      // Keep the last known flags on network errors
      set({ loaded: true });
    }
  }
}));

export const useFeatureFlags = () => useFeatureFlagsStore(useShallow((s) => ({
  subscriptionEnabled: s.subscriptionEnabled,
  razorpayEnabled: s.razorpayEnabled,
  loaded: s.loaded
})));

export default useFeatureFlagsStore;
