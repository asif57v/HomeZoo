import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/apiService';
import { storage } from './storage';

// Wizard draft persistence (port of web utils/draftStore.js): AsyncStorage (instant, offline) mirrored to the server
// via PUT /hotels/property-drafts/:key so a partner can resume after closing the app.
const SYNC_DELAY_MS = 2000;
const timers = {};
const pending = {};
const hasToken = () => !!storage.getItem('token');
export const serverKey = (k) => String(k).trim();

const pushNow = async (key) => {
  const raw = pending[key];
  if (!raw || !hasToken()) return;
  let parsed; try { parsed = JSON.parse(raw); } catch { return; }
  try {
    await api.put(`/hotels/property-drafts/${encodeURIComponent(serverKey(key))}`, { data: parsed, step: parsed.step, title: parsed.propertyForm?.propertyName || '', schemaVersion: 1 });
    delete pending[key];
  } catch { /* offline: retried on next save / flush */ }
};

const draftStore = {
  save(key, rawJson) {
    AsyncStorage.setItem(key, rawJson).catch(() => {});
    pending[key] = rawJson;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => { delete timers[key]; pushNow(key); }, SYNC_DELAY_MS);
  },
  flushNow() { Object.keys(timers).forEach((k) => { clearTimeout(timers[k]); delete timers[k]; pushNow(k); }); },
  clear(key) {
    clearTimeout(timers[key]); delete timers[key]; delete pending[key];
    AsyncStorage.removeItem(key).catch(() => {});
    if (hasToken()) api.delete(`/hotels/property-drafts/${encodeURIComponent(serverKey(key))}`).catch(() => {});
  },
  async loadLocal(key) { try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  async fetchRemote(key) {
    if (!hasToken()) return null;
    try { const res = await api.get(`/hotels/property-drafts/${encodeURIComponent(serverKey(key))}`); return res.data?.draft?.data || null; } catch { return null; }
  },
};

export default draftStore;
