import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X, Loader2, Check, LayoutPanelLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

// Built-in look of each Home tab (mirrors THEME_MAP + taglines on the user Home page).
// Empty admin fields fall back to these values.
export const HERO_DEFAULTS = {
  all: { label: 'All', title: '', subtitle: 'Your home, your way.', gradientFrom: '#002240', gradientTo: '#005CA8', accent: '#005CA8', leftImage: '/buy_hero_art.png', rightImage: '/buy_hero_art_2.png' },
  pg: { label: 'PG/Co-Living', title: 'Scholar & Professional Stays.', subtitle: 'Premium PGs and Co-living spaces designed for comfort.', gradientFrom: '#881337', gradientTo: '#9F1239', accent: '#E11D48', leftImage: '/pg_hero_art.png', rightImage: '/pg_hero_art_2.png' },
  rent: { label: 'Rent', title: 'Premium Homes for Rent.', subtitle: 'Find your ideal match from chic apartments to spacious villas.', gradientFrom: '#4C1D95', gradientTo: '#5B21B6', accent: '#8B5CF6', leftImage: '/rent_hero_art.png', rightImage: '/rent_hero_art_2.png' },
  buy: { label: 'Buy', title: 'Invest in your Future.', subtitle: 'Discover exclusive properties and luxury estates for sale.', gradientFrom: '#1E3A8A', gradientTo: '#1E40AF', accent: '#3B82F6', leftImage: '/buy_hero_art.png', rightImage: '/buy_hero_art_2.png' },
  plot: { label: 'Plot', title: 'Premium Plots in Prime Locations.', subtitle: 'Build your vision on the perfect foundation.', gradientFrom: '#A84900', gradientTo: '#D97706', accent: '#F59E0B', leftImage: '/plot_hero_art.png', rightImage: '/plot_hero_art_2.png' }
};

export const HERO_KEYS = Object.keys(HERO_DEFAULTS);

export const emptyHero = () => ({
  design: 'classic', title: '', subtitle: '', gradientFrom: '', gradientTo: '', accent: '',
  leftImage: '', rightImage: '', bgImage: '', overlay: 35
});

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const inputCls = 'w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs';
const labelCls = 'block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1';

const ImageField = ({ label, hint, value, fallback, onChange }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 8 * 1024 * 1024) return toast.error('Image must be under 8 MB');
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('images', file);
      const res = await adminService.uploadImage(fd);
      const url = res.urls?.[0] || res.files?.[0]?.url;
      if (!url) throw new Error('Upload returned no URL');
      onChange(url);
      toast.success('Image uploaded. Click Save Changes to apply.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const shown = value || fallback;

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-24 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
          {shown ? <img src={shown} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-gray-300" />}
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100"
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400">{value ? 'Custom image' : fallback ? 'Using default image' : 'No image'}{hint ? ` · ${hint}` : ''}</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
};

const ColorField = ({ label, value, fallback, onChange }) => {
  const valid = !value || HEX_RE.test(value);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) && value.length === 7 ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white shrink-0"
        />
        <input
          type="text"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={fallback}
          className={`${inputCls} ${valid ? '' : 'border-red-400'}`}
        />
        {value && (
          <button type="button" onClick={() => onChange('')} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Reset colour">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

/** Small live preview of the hero for the selected tab. */
const HeroPreview = ({ hero, def }) => {
  const title = hero.title || def.title || 'Find your next home';
  const subtitle = hero.subtitle || def.subtitle;
  const accent = hero.accent || def.accent;
  const overlay = (hero.overlay ?? 35) / 100;

  if (hero.design === 'photo') {
    const bg = hero.bgImage || hero.leftImage || def.leftImage;
    return (
      <div className="relative h-44 rounded-xl overflow-hidden">
        <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,${overlay}) 0%, rgba(0,0,0,${overlay * 0.55}) 55%, rgba(0,0,0,${Math.min(0.85, overlay * 1.2)}) 100%)` }} />
        <PreviewContent title={title} subtitle={subtitle} accent={accent} glass />
      </div>
    );
  }

  const from = hero.gradientFrom || def.gradientFrom;
  const to = hero.gradientTo || def.gradientTo;
  const mask = { WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)', maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)' };
  return (
    <div className="relative h-44 rounded-xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
      <img src={hero.leftImage || def.leftImage} alt="" className="absolute -left-10 top-1/2 -translate-y-1/2 w-44 object-cover" style={mask} />
      <img src={hero.rightImage || def.rightImage} alt="" className="absolute -right-10 top-1/2 -translate-y-1/2 w-44 object-cover" style={mask} />
      <PreviewContent title={title} subtitle={subtitle} accent={accent} />
    </div>
  );
};

const PreviewContent = ({ title, subtitle, accent, glass }) => (
  <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6">
    <p className="text-sm font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{title}</p>
    {subtitle && <p className="text-[10px] opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">{subtitle}</p>}
    <div className="w-6 h-0.5 rounded-full mt-1.5" style={{ backgroundColor: accent }} />
    <div className="mt-2 w-3/4 max-w-sm h-6 rounded-full bg-white flex items-center justify-between pl-3 pr-0.5">
      <span className="text-[8px] text-gray-400">Search locality, project or builder...</span>
      <span className="text-[8px] font-bold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: accent }}>Search</span>
    </div>
    <div className="flex gap-2 mt-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`w-5 h-5 rounded-md border ${i === 4 ? 'bg-white border-white' : glass ? 'bg-black/35 border-white/25' : 'bg-white/15 border-white/20'}`} />
      ))}
    </div>
  </div>
);

const DesignOption = ({ active, onClick, icon: Icon, title, text }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-blue-600 bg-blue-50/60' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
  >
    {active && (
      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
        <Check size={12} />
      </span>
    )}
    <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
    <p className="text-xs font-black text-gray-900 mt-1.5">{title}</p>
    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{text}</p>
  </button>
);

/**
 * Admin editor for the Home hero per tab (All / PG / Rent / Buy / Plot).
 * value: { all: {...}, pg: {...}, ... } ; onChange(nextValue)
 */
const HeroBannersEditor = ({ value, onChange }) => {
  const [activeKey, setActiveKey] = useState('all');
  const hero = { ...emptyHero(), ...(value?.[activeKey] || {}) };
  const def = HERO_DEFAULTS[activeKey];

  const set = (patch) => onChange({ ...value, [activeKey]: { ...hero, ...patch } });

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
      <div>
        <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-600" /> Hero Banners
        </h2>
        <p className="text-[11px] text-gray-400">
          Choose the top banner design and images for each Home tab. Empty fields keep the built-in default.
        </p>
      </div>

      {/* Tab picker */}
      <div className="flex flex-wrap gap-1.5">
        {HERO_KEYS.map((k) => {
          const d = value?.[k]?.design === 'photo' ? 'Photo' : 'Classic';
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveKey(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeKey === k ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {HERO_DEFAULTS[k].label}
              <span className={`ml-1.5 text-[9px] font-semibold ${activeKey === k ? 'text-white/60' : 'text-gray-400'}`}>{d}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {/* Design */}
          <div>
            <label className={labelCls}>Design</label>
            <div className="grid grid-cols-2 gap-2">
              <DesignOption
                active={hero.design !== 'photo'}
                onClick={() => set({ design: 'classic' })}
                icon={LayoutPanelLeft}
                title="Classic"
                text="Colour gradient with two floating images on the left and right"
              />
              <DesignOption
                active={hero.design === 'photo'}
                onClick={() => set({ design: 'photo' })}
                icon={ImageIcon}
                title="Full Photo"
                text="One wide background image across the full banner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title</label>
              <input type="text" maxLength={80} value={hero.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} placeholder={def.title || '(no title)'} />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <input type="text" maxLength={140} value={hero.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className={inputCls} placeholder={def.subtitle} />
            </div>
          </div>

          <ColorField label="Accent colour (search button, icons)" value={hero.accent} fallback={def.accent} onChange={(v) => set({ accent: v })} />

          {hero.design === 'photo' ? (
            <>
              <ImageField
                label="Background image"
                hint="wide landscape, 1920×600 or larger"
                value={hero.bgImage}
                fallback=""
                onChange={(v) => set({ bgImage: v })}
              />
              {!hero.bgImage && (
                <p className="text-[10px] text-amber-600 font-semibold -mt-2">Upload a background image. Until then the left side image is used.</p>
              )}
              <div>
                <label className={labelCls}>Darkness overlay: {hero.overlay}%</label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={hero.overlay}
                  onChange={(e) => set({ overlay: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
                <p className="text-[10px] text-gray-400">Darkens the photo so the white title stays readable.</p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorField label="Gradient start" value={hero.gradientFrom} fallback={def.gradientFrom} onChange={(v) => set({ gradientFrom: v })} />
                <ColorField label="Gradient end" value={hero.gradientTo} fallback={def.gradientTo} onChange={(v) => set({ gradientTo: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ImageField label="Left image" hint="square, ~900px" value={hero.leftImage} fallback={def.leftImage} onChange={(v) => set({ leftImage: v })} />
                <ImageField label="Right image" hint="square, ~900px" value={hero.rightImage} fallback={def.rightImage} onChange={(v) => set({ rightImage: v })} />
              </div>
            </>
          )}
        </div>

        <div>
          <label className={labelCls}>Preview — {def.label}</label>
          <HeroPreview hero={hero} def={def} />
          <p className="text-[10px] text-gray-400 mt-1.5">Approximate preview. Changes go live after Save Changes.</p>
        </div>
      </div>
    </section>
  );
};

export default HeroBannersEditor;
