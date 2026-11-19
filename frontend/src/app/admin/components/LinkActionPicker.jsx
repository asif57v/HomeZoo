import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, Loader2 } from 'lucide-react';
import adminService from '../../../services/adminService';

/**
 * "Tap / Click Action" picker shared by Banners and Offers.
 * Value shape: { linkType, linkValue }.
 *  - CATEGORY: pick from `categories`
 *  - PROPERTY: searchable picker over approved properties (stores property _id)
 *  - OFFER: pick from `offers` (stores coupon code) — only when `offers` is passed
 *  - EXTERNAL_URL: free text URL
 */
const LinkActionPicker = ({
  linkType,
  linkValue,
  onChange,
  categories = [],
  offers = null,
  noneLabel = 'None (no redirect)'
}) => {
  const types = [
    { value: 'NONE', label: noneLabel },
    { value: 'CATEGORY', label: 'Specific Category' },
    { value: 'PROPERTY', label: 'Property Details' },
    ...(offers ? [{ value: 'OFFER', label: 'Specific Offer / Promo' }] : []),
    { value: 'EXTERNAL_URL', label: 'External Website URL' }
  ];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [open, setOpen] = useState(false);
  const debounce = useRef();

  // Resolve the name of an already-selected property (edit mode)
  useEffect(() => {
    if (linkType !== 'PROPERTY' || !linkValue) {
      setSelectedProperty(null);
      return;
    }
    if (selectedProperty?._id === linkValue) return;
    let cancelled = false;
    adminService.getHotelDetails?.(linkValue)
      .then((res) => {
        const p = res?.hotel || res?.property || res;
        if (!cancelled && p?._id) setSelectedProperty(p);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkType, linkValue]);

  // Debounced property search
  useEffect(() => {
    if (linkType !== 'PROPERTY' || !open) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await adminService.getHotels({ search: query, status: 'approved', limit: 8 });
        setResults(res.hotels || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query, open, linkType]);

  const pickProperty = (p) => {
    setSelectedProperty(p);
    onChange({ linkType: 'PROPERTY', linkValue: p._id });
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
      <div>
        <label className="block font-bold text-gray-700 uppercase tracking-wider">Tap / Click Action (Optional)</label>
        <p className="text-[10px] text-gray-400">Where should the user land when they tap this? Leave as None for no redirect.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-500 mb-1">Action Type</label>
          <select
            value={linkType}
            onChange={(e) => onChange({ linkType: e.target.value, linkValue: '' })}
            className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none"
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-500 mb-1">Target Value</label>
          {linkType === 'CATEGORY' ? (
            <select
              value={linkValue}
              onChange={(e) => onChange({ linkType, linkValue: e.target.value })}
              className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.slug || c._id} value={c.slug || c._id}>
                  {c.displayName || c.name} ({c.slug})
                </option>
              ))}
            </select>
          ) : linkType === 'OFFER' && offers ? (
            <select
              value={linkValue}
              onChange={(e) => onChange({ linkType, linkValue: e.target.value })}
              className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none"
            >
              <option value="">Select offer...</option>
              {offers.map((o) => (
                <option key={o._id} value={o.code}>{o.code} — {o.title}</option>
              ))}
            </select>
          ) : linkType === 'PROPERTY' ? (
            <div className="text-gray-400 text-[11px] py-1.5">Search & pick below</div>
          ) : (
            <input
              type="text"
              disabled={linkType === 'NONE'}
              value={linkValue}
              onChange={(e) => onChange({ linkType, linkValue: e.target.value })}
              className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none disabled:bg-gray-100 disabled:text-gray-400"
              placeholder={linkType === 'EXTERNAL_URL' ? 'https://example.com' : 'No link'}
            />
          )}
        </div>
      </div>

      {linkType === 'PROPERTY' && (
        <div className="relative">
          {linkValue && selectedProperty ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
              <Building2 size={14} className="text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 truncate">{selectedProperty.propertyName}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  {[selectedProperty.address?.city, selectedProperty.propertyType].filter(Boolean).join(' • ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedProperty(null); onChange({ linkType, linkValue: '' }); }}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onFocus={() => setOpen(true)}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  placeholder="Search property by name or city..."
                  className="w-full pl-8 pr-8 py-1.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searching && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              </div>
              {open && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {results.length === 0 && !searching ? (
                    <p className="px-3 py-2 text-gray-400">No approved properties found</p>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => pickProperty(p)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="font-bold text-gray-800 truncate">{p.propertyName}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {[p.address?.city, p.propertyType].filter(Boolean).join(' • ')}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LinkActionPicker;
