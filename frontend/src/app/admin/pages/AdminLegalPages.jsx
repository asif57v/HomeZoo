import React, { useEffect, useState } from 'react';
import { FileText, Shield, Info, PhoneCall, LifeBuoy, Save, Eye, Heading, List } from 'lucide-react';
import adminService from '../../../services/adminService';
import LegalContent, { formatUpdated } from '../../../components/ui/LegalContent';

const SLUG_META = [
  { slug: 'terms', label: 'Terms & Conditions', icon: FileText },
  { slug: 'privacy', label: 'Privacy Policy', icon: Shield },
  { slug: 'support', label: 'Help & Support', icon: LifeBuoy },
  { slug: 'about', label: 'About Us', icon: Info },
  { slug: 'contact', label: 'Contact Us', icon: PhoneCall }
];

const SUPPORT_FIELDS = [
  { key: 'supportEmail', label: 'Support Email', placeholder: 'support@hoomzo.in' },
  { key: 'supportPhone', label: 'Support Phone', placeholder: '9111384535' },
  { key: 'supportWhatsapp', label: 'WhatsApp Number (with country code)', placeholder: '919111384535' },
  { key: 'supportHours', label: 'Support Hours', placeholder: 'Every day, 9:00 AM - 9:00 PM' }
];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-surface/60';

// Each admin route renders this editor for its own page(s): slugs=['terms'], ['privacy'], ['support'] or ['about','contact'].
const AdminLegalPages = ({ slugs = ['terms'] }) => {
  const [audience, setAudience] = useState('user');
  const [slug, setSlug] = useState(slugs[0]);
  const tabs = SLUG_META.filter((m) => slugs.includes(m.slug));
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPages = async (aud) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getLegalPages({ audience: aud });
      const map = {};
      (res.pages || []).forEach((p) => {
        map[p.slug] = p;
      });
      setPages(map);
    } catch (e) {
      setError('Unable to fetch pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSlug(slugs[0]);
    setPreview(false);
    setMessage('');
    setError('');
  }, [slugs.join()]);

  useEffect(() => {
    loadPages(audience);
  }, [audience]);

  const meta = SLUG_META.find((m) => m.slug === slug);
  const page = pages[slug] || {};

  const setField = (field, value) =>
    setPages((prev) => ({ ...prev, [slug]: { ...(prev[slug] || { slug, audience }), [field]: value } }));

  const insertSyntax = (prefix) => {
    const current = page.content || '';
    setField('content', `${current}${current && !current.endsWith('\n') ? '\n' : ''}${prefix}`);
  };

  const handleSave = async () => {
    setMessage('');
    setError('');
    if (!(page.content || '').trim()) {
      setError('Content cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await adminService.saveLegalPage({
        audience,
        slug,
        title: page.title || meta.label,
        content: page.content,
        isActive: page.isActive !== false,
        ...(slug === 'support'
          ? Object.fromEntries(SUPPORT_FIELDS.map(({ key }) => [key, page[key] || '']))
          : {})
      });
      setMessage(`${meta.label} saved. It is now live in the ${audience} app.`);
      await loadPages(audience);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{tabs.map((t) => t.label).join(' & ')}</h2>
          <p className="text-gray-500 text-sm">
            Edit this page for the user app or the partner app. Changes go live instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
          {['user', 'partner'].map((a) => (
            <button
              key={a}
              onClick={() => {
                setAudience(a);
                setMessage('');
                setError('');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${
                audience === a ? 'bg-surface text-white' : 'text-gray-600'
              }`}
            >
              {a} app
            </button>
          ))}
        </div>
      </div>

      {tabs.length > 1 && (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ slug: s, label, icon: Icon }) => (
          <button
            key={s}
            onClick={() => {
              setSlug(s);
              setMessage('');
              setError('');
              setPreview(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition ${
              slug === s
                ? 'bg-surface text-white border-surface'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon size={14} /> {label}
            {pages[s] && pages[s].isActive === false && <span className="text-[9px] opacity-70">(hidden)</span>}
          </button>
        ))}
      </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">{error}</div>}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-2">
          {message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">{meta.label}</p>
            <p className="text-[11px] text-gray-500">
              {page.updatedAt ? `Last updated ${formatUpdated(page)}` : 'Not published yet - app shows default text'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={page.isActive !== false}
              onChange={(e) => setField('isActive', e.target.checked)}
              className="accent-[#005CA8] w-4 h-4"
            />
            Visible in app
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Title</label>
          <input
            type="text"
            value={page.title ?? meta.label}
            onChange={(e) => setField('title', e.target.value)}
            className={inputCls}
          />
        </div>

        {slug === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUPPORT_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={page[key] || ''}
                  placeholder={placeholder}
                  onChange={(e) => setField(key, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-600">Content</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertSyntax('# Heading')}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                title="Add heading"
              >
                <Heading size={14} />
              </button>
              <button
                type="button"
                onClick={() => insertSyntax('- Bullet point')}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                title="Add bullet"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                  preview ? 'bg-surface text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Eye size={14} /> Preview
              </button>
            </div>
          </div>
          {preview ? (
            <div className="min-h-[320px] rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-bold text-lg mb-3">{page.title || meta.label}</h3>
              <LegalContent content={page.content || ''} />
            </div>
          ) : (
            <textarea
              rows={14}
              value={page.content || ''}
              onChange={(e) => setField('content', e.target.value)}
              className={`${inputCls} font-mono resize-y`}
              placeholder={'# 1. Heading\nParagraph text.\n\n- Bullet point\n- Another bullet'}
            />
          )}
          <p className="mt-1 text-[11px] text-gray-400">
            Use <code># Heading</code>, <code>## Sub heading</code>, <code>- bullet</code>. Leave a blank line between
            paragraphs.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-surface text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-transform"
        >
          <Save size={16} />
          {saving ? 'Saving...' : `Save ${meta.label}`}
        </button>
      </div>
    </div>
  );
};

export default AdminLegalPages;
