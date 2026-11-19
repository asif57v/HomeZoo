import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Synchronous, memory-cached replacement for the web's localStorage.
// Tokens live in SecureStore; everything else in AsyncStorage.
const SECURE_KEYS = new Set(['token']);
const cache = {};
const KEYS = ['token', 'user', 'user_location', 'user_coords', 'recentSearches', 'wizardDrafts', 'hoomzo_prefs'];

export const hydrateStorage = async () => {
  try {
    for (const k of KEYS) {
      try {
        const v = SECURE_KEYS.has(k) ? await SecureStore.getItemAsync(k) : await AsyncStorage.getItem(k);
        if (v != null) cache[k] = v;
      } catch {}
    }
  } catch {}
};

export const storage = {
  getItem: (k) => (k in cache ? cache[k] : null),
  setItem: (k, v) => {
    cache[k] = String(v);
    if (SECURE_KEYS.has(k)) SecureStore.setItemAsync(k, String(v)).catch(() => {});
    else AsyncStorage.setItem(k, String(v)).catch(() => {});
  },
  removeItem: (k) => {
    delete cache[k];
    if (SECURE_KEYS.has(k)) SecureStore.deleteItemAsync(k).catch(() => {});
    else AsyncStorage.removeItem(k).catch(() => {});
  },
};

export const getJSON = (k, fallback = null) => {
  try { const v = storage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
export const setJSON = (k, v) => storage.setItem(k, JSON.stringify(v));
