import { create } from 'zustand';
import { storage, getJSON } from '../lib/storage';
import { authService, userService } from '../services/apiService';
import { registerForPush } from '../lib/push';

// Auth state mirrors the web's localStorage('token' / 'user') contract (JWT bearer, no refresh endpoint exists)
const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  ready: false,

  init: () => {
    set({ token: storage.getItem('token'), user: getJSON('user', null), ready: true });
  },

  verifyOtp: async (payload) => {
    const data = await authService.verifyOtp(payload); // stores token + user in storage
    set({ token: data.token || storage.getItem('token'), user: data.user || getJSON('user', null) });
    registerForPush().catch(() => {});
    return data;
  },

  setUser: (user) => {
    storage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  refreshProfile: async () => {
    try {
      const res = await userService.getProfile();
      const u = res.user || res;
      if (u && (u._id || u.id)) get().setUser({ ...(get().user || {}), ...u });
    } catch {}
  },

  logout: async () => {
    await authService.logout('app');
    set({ token: null, user: null });
  },

  // Called when the API reports 401 / blocked: storage was already cleared by the interceptor
  expire: () => set({ token: null, user: null }),
}));

export default useAuthStore;
