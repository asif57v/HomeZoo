import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Search, Plus, X, ArrowUp, ArrowDown, Save, Loader2, Star, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

const MAX_TOP_PROPERTIES = 20;

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

const AdminHomeSections = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [top, setTop] = useState({ enabled: true, title: 'Top Properties', subtitle: '', properties: [] });
  const [featured, setFeatured] = useState({ enabled: true, title: 'Featured Categories', subtitle: '' });

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminService.getHomeSettings();
        setTop(data.topProperties);
        setFeatured(data.featuredCategories);
      } catch {
        toast.error('Failed to load home sections');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Debounced search of approved properties
  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminService.getHotels({ status: 'approved', limit: 8, page: 1, search: search.trim() || undefined });
        setResults(res.hotels || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const selectedIds = new Set(top.properties.map((p) => p._id));

  const addProperty = (p) => {
    if (selectedIds.has(p._id)) return;
    if (top.properties.length >= MAX_TOP_PROPERTIES) {
      toast.error(`You can select at most ${MAX_TOP_PROPERTIES} properties`);
      return;
    }
    setTop((prev) => ({ ...prev, properties: [...prev.properties, p] }));
  };

  const removeProperty = (id) => {
    setTop((prev) => ({ ...prev, properties: prev.properties.filter((p) => p._id !== id) }));
  };

  const moveProperty = (index, dir) => {
    setTop((prev) => {
      const next = [...prev.properties];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, properties: next };
    });
  };

  const handleSave = async () => {
    if (!top.title.trim()) return toast.error('Top Properties title is required');
    if (!featured.title.trim()) return toast.error('Featured Categories title is required');

    try {
      setSaving(true);
      await adminService.updateHomeSettings({
        topProperties: {
          enabled: top.enabled,
          title: top.title,
          subtitle: top.subtitle,
          propertyIds: top.properties.map((p) => p._id)
        },
        featuredCategories: {
          enabled: featured.enabled,
          title: featured.title,
          subtitle: featured.subtitle
        }
      });
      toast.success('Home sections saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save home sections');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-bold">Loading home sections...</p>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs';

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <LayoutTemplate className="text-blue-600" />
            Home Sections
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Control the Top Properties and Featured Categories sections shown on the user Home page
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {/* Top Properties */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Star size={16} className="text-amber-500" /> Top Properties
            </h2>
            <p className="text-[11px] text-gray-400">Hand-picked properties shown in the order below. Hidden when switched off or empty.</p>
          </div>
          <Toggle checked={top.enabled} onChange={(v) => setTop({ ...top, enabled: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Section Title *</label>
            <input
              type="text"
              maxLength={80}
              value={top.title}
              onChange={(e) => setTop({ ...top, title: e.target.value })}
              className={inputCls}
              placeholder="Top Properties"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Subtitle (Optional)</label>
            <input
              type="text"
              maxLength={140}
              value={top.subtitle}
              onChange={(e) => setTop({ ...top, subtitle: e.target.value })}
              className={inputCls}
              placeholder="Most loved stays this month"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Search & add */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Add approved properties</label>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or city..."
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {searching ? (
                <p className="p-4 text-center text-xs text-gray-400">Searching...</p>
              ) : results.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-400">No approved properties found</p>
              ) : (
                results.map((p) => {
                  const added = selectedIds.has(p._id);
                  return (
                    <div key={p._id} className="flex items-center gap-3 p-2.5">
                      <img src={p.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.propertyName}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {p.propertyType} • {p.address?.area ? `${p.address.area}, ` : ''}{p.address?.city}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => addProperty(p)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {added ? 'Added' : <><Plus size={12} /> Add</>}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected & order */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Selected ({top.properties.length}/{MAX_TOP_PROPERTIES}) — display order
            </label>
            {top.properties.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-xs text-gray-400">
                No properties selected. The section stays hidden on the Home page.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {top.properties.map((p, i) => (
                  <div key={p._id} className="flex items-center gap-3 p-2.5">
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <img src={p.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{p.propertyName}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {p.address?.city}
                        {(p.status !== 'approved' || p.isLive === false) && (
                          <span className="ml-1 text-red-500 font-bold">• Not live (hidden from users)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={() => moveProperty(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move up">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveProperty(i, 1)} disabled={i === top.properties.length - 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move down">
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" onClick={() => removeProperty(p._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" aria-label="Remove">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900">Featured Categories</h2>
            <p className="text-[11px] text-gray-400">
              Heading and visibility of the section. Choose which categories appear (and their order) in{' '}
              <Link to="/admin/categories" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5">
                Categories <ExternalLink size={10} />
              </Link>{' '}
              using the "Featured" option.
            </p>
          </div>
          <Toggle checked={featured.enabled} onChange={(v) => setFeatured({ ...featured, enabled: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Section Title *</label>
            <input
              type="text"
              maxLength={80}
              value={featured.title}
              onChange={(e) => setFeatured({ ...featured, title: e.target.value })}
              className={inputCls}
              placeholder="Featured Categories"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Subtitle (Optional)</label>
            <input
              type="text"
              maxLength={140}
              value={featured.subtitle}
              onChange={(e) => setFeatured({ ...featured, subtitle: e.target.value })}
              className={inputCls}
              placeholder="Explore by what you need"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminHomeSections;
