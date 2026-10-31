import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileClock, Trash2 } from 'lucide-react';
import draftStore from '../../../utils/draftStore';

const LOCAL_PREFIX = 'hoomzo_';
const LOCAL_MARKER = '_wizard_draft_';

const TYPE_ROUTES = {
  pg: '/hotel/join-pg',
  hostel: '/hotel/join-hostel',
  hotel: '/hotel/join-hotel',
  resort: '/hotel/join-resort',
  villa: '/hotel/join-villa',
  homestay: '/hotel/join-homestay',
};

// "hoomzo_pg_wizard_draft_new" -> { label: 'PG', path: '/hotel/join-pg' }
// "hoomzo_hotel_wizard_draft_dynamic_<categoryId>" -> dynamic category wizard
const describeKey = (key) => {
  const k = key.trim();
  const dyn = k.match(/_wizard_draft_dynamic_(.+)$/);
  if (dyn) return { label: 'Property', path: `/hotel/join-dynamic/${dyn[1]}` };
  const m = k.match(/^hoomzo_([a-z]+)_wizard_draft_new$/);
  if (m && TYPE_ROUTES[m[1]]) {
    return { label: m[1] === 'pg' ? 'PG' : m[1][0].toUpperCase() + m[1].slice(1), path: TYPE_ROUTES[m[1]] };
  }
  return null;
};

const readLocalDrafts = () => {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(LOCAL_PREFIX) || !k.includes(LOCAL_MARKER)) continue;
      const parsed = JSON.parse(localStorage.getItem(k));
      if (!parsed || !(parsed.step >= 1) || !parsed.propertyForm) continue;
      out.push({ draftKey: k.trim(), title: parsed.propertyForm.propertyName || '', step: parsed.step, updatedAt: null, storageKey: k });
    }
  } catch { /* ignore unreadable drafts */ }
  return out;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} day(s) ago`;
};

/** "Continue your listing" cards for add-property wizards that were left unfinished. */
const WizardDraftsBanner = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    const local = readLocalDrafts();
    const remote = await draftStore.listRemote();
    const byKey = new Map();
    remote.forEach((d) => byKey.set(d.draftKey.trim(), { ...d, storageKey: d.draftKey }));
    // Local drafts are newer than the server copy, so they win; keep server time if we have it
    local.forEach((d) => byKey.set(d.draftKey, { ...byKey.get(d.draftKey), ...d, updatedAt: byKey.get(d.draftKey)?.updatedAt || null }));
    setItems([...byKey.values()].filter((d) => describeKey(d.draftKey)));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!items.length) return null;

  const discard = async (d) => {
    if (!window.confirm('Discard this unfinished listing? This cannot be undone.')) return;
    draftStore.clear(d.storageKey);
    await draftStore.deleteRemote(d.draftKey);
    load();
  };

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
        <FileClock size={16} className="text-[#005CA8]" /> Continue where you left off
      </h3>
      <div className="space-y-2">
        {items.map((d) => {
          const info = describeKey(d.draftKey);
          return (
            <div key={d.draftKey} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-blue-100 p-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{d.title || `Untitled ${info.label} listing`}</p>
                <p className="text-[11px] text-gray-500">{info.label} · Step {d.step}{d.updatedAt ? ` · saved ${timeAgo(d.updatedAt)}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => navigate(info.path)} className="px-3 py-1.5 rounded-full bg-[#005CA8] text-white text-[11px] font-bold uppercase active:scale-95">Continue</button>
                <button onClick={() => discard(d)} aria-label="Discard draft" className="p-2 rounded-full text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardDraftsBanner;
