import { api } from '../services/apiService';
import { API_BASE_URL } from '../config/apiConfig';

/**
 * Wizard draft persistence: localStorage (instant, offline) mirrored to the server
 * so a partner can resume after a crash, app close or cleared app data.
 */
const PENDING_PREFIX = 'hoomzo_draft_pending_';
const SYNC_DELAY_MS = 2000;
const timers = {};

export const serverKey = (storageKey) => String(storageKey).trim();

const safeLocal = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const hasToken = () => !!safeLocal.get('token');

const pushNow = async (storageKey, { keepalive = false } = {}) => {
  const raw = safeLocal.get(storageKey);
  if (!raw || !hasToken()) return;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return; }
  const body = {
    data: parsed,
    step: parsed.step,
    title: parsed.propertyForm?.propertyName || '',
    schemaVersion: 1,
  };
  try {
    if (keepalive) {
      // Page is closing: axios may be cancelled, a keepalive fetch survives
      fetch(`${API_BASE_URL}/hotels/property-drafts/${encodeURIComponent(serverKey(storageKey))}`, {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${safeLocal.get('token')}` },
        body: JSON.stringify(body),
      }).catch(() => {});
      return;
    }
    await api.put(`/hotels/property-drafts/${encodeURIComponent(serverKey(storageKey))}`, body);
    safeLocal.remove(PENDING_PREFIX + storageKey);
  } catch {
    // Offline or server error: remember to retry when we are back online
    safeLocal.set(PENDING_PREFIX + storageKey, '1');
  }
};

const flushAll = (keepalive) => {
  Object.keys(timers).forEach((k) => {
    clearTimeout(timers[k]);
    delete timers[k];
    pushNow(k, { keepalive });
  });
};

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll(true);
  });
  window.addEventListener('pagehide', () => flushAll(true));
  window.addEventListener('online', () => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PENDING_PREFIX)) pushNow(k.slice(PENDING_PREFIX.length));
    }
  });
}

export const draftStore = {
  /** Save locally right away and sync to the server shortly after. */
  save(storageKey, rawJson) {
    safeLocal.set(storageKey, rawJson);
    clearTimeout(timers[storageKey]);
    timers[storageKey] = setTimeout(() => {
      delete timers[storageKey];
      pushNow(storageKey);
    }, SYNC_DELAY_MS);
  },

  /** Push any pending change to the server immediately (e.g. when leaving the wizard). */
  flushNow() {
    flushAll(false);
  },

  /** Remove the draft everywhere (after submit or when the partner discards it). */
  clear(storageKey) {
    clearTimeout(timers[storageKey]);
    delete timers[storageKey];
    safeLocal.remove(storageKey);
    safeLocal.remove(PENDING_PREFIX + storageKey);
    if (hasToken()) {
      api.delete(`/hotels/property-drafts/${encodeURIComponent(serverKey(storageKey))}`).catch(() => {});
    }
  },

  /** Draft saved on the server, or null (offline, none saved, or not a partner). */
  async fetchRemote(storageKey) {
    if (!hasToken()) return null;
    try {
      const res = await api.get(`/hotels/property-drafts/${encodeURIComponent(serverKey(storageKey))}`);
      return res.data?.draft?.data || null;
    } catch {
      return null;
    }
  },

  async listRemote() {
    if (!hasToken()) return [];
    try {
      const res = await api.get('/hotels/property-drafts');
      return res.data?.drafts || [];
    } catch {
      return [];
    }
  },

  async deleteRemote(key) {
    try { await api.delete(`/hotels/property-drafts/${encodeURIComponent(key)}`); } catch { /* ignore */ }
  },
};

export default draftStore;
