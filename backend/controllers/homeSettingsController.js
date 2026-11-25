import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { getHomeSettingsDoc, HERO_KEYS, HERO_DESIGNS } from '../models/HomeSettings.js';

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
// Uploaded images are absolute http(s) URLs; built-in ones are site paths like /plot_hero_art.png
const IMG_RE = /^(https?:\/\/|\/)[^\s"'()<>]*$/i;

/** Plain-object view of the hero banner config, one entry per Home tab. */
export const serializeHeroBanners = (doc) => {
  const out = {};
  for (const key of HERO_KEYS) {
    const h = doc.heroBanners?.[key] || {};
    out[key] = {
      design: HERO_DESIGNS.includes(h.design) ? h.design : 'classic',
      title: h.title || '',
      subtitle: h.subtitle || '',
      gradientFrom: h.gradientFrom || '',
      gradientTo: h.gradientTo || '',
      accent: h.accent || '',
      leftImage: h.leftImage || '',
      rightImage: h.rightImage || '',
      bgImage: h.bgImage || '',
      overlay: typeof h.overlay === 'number' ? h.overlay : 35
    };
  }
  return out;
};

/** Validates and applies req.body.heroBanners onto the doc. Returns an error message or null. */
const applyHeroBanners = (doc, heroBanners) => {
  if (typeof heroBanners !== 'object' || Array.isArray(heroBanners)) return 'heroBanners must be an object';
  if (!doc.heroBanners) doc.heroBanners = {};

  for (const key of HERO_KEYS) {
    const input = heroBanners[key];
    if (!input || typeof input !== 'object') continue;
    const current = doc.heroBanners[key] ? doc.heroBanners[key].toObject?.() || doc.heroBanners[key] : {};
    const next = { ...current };

    if (input.design !== undefined) {
      if (!HERO_DESIGNS.includes(input.design)) return `Invalid design for ${key}`;
      next.design = input.design;
    }
    if (input.title !== undefined) next.title = clean(input.title, 80) ?? '';
    if (input.subtitle !== undefined) next.subtitle = clean(input.subtitle, 140) ?? '';

    for (const field of ['gradientFrom', 'gradientTo', 'accent']) {
      if (input[field] === undefined) continue;
      const v = clean(input[field], 20) ?? '';
      if (v && !HEX_RE.test(v)) return `${field} for ${key} must be a hex colour like #D97706`;
      next[field] = v;
    }
    for (const field of ['leftImage', 'rightImage', 'bgImage']) {
      if (input[field] === undefined) continue;
      const v = clean(input[field], 1000) ?? '';
      if (v && !IMG_RE.test(v)) return `${field} for ${key} must be an image URL`;
      next[field] = v;
    }
    if (input.overlay !== undefined) {
      const n = Number(input.overlay);
      if (!Number.isFinite(n)) return `overlay for ${key} must be a number`;
      next.overlay = Math.min(80, Math.max(0, Math.round(n)));
    }

    doc.heroBanners[key] = next;
  }
  doc.markModified('heroBanners');
  return null;
};

/**
 * @desc    Get Home page section settings with populated top properties (Admin)
 * @route   GET /api/home/settings
 * @access  Admin
 */
export const getAdminHomeSettings = async (req, res) => {
  try {
    const doc = await getHomeSettingsDoc();
    const ids = doc.topProperties.propertyIds || [];

    const props = await Property.find({ _id: { $in: ids } })
      .select('propertyName propertyType coverImage address.city address.area status isLive')
      .lean();
    const byId = new Map(props.map((p) => [String(p._id), p]));

    // Keep admin order, drop deleted properties
    const topProperties = ids.map((id) => byId.get(String(id))).filter(Boolean);

    res.json({
      topProperties: {
        enabled: doc.topProperties.enabled,
        title: doc.topProperties.title,
        subtitle: doc.topProperties.subtitle,
        properties: topProperties
      },
      featuredCategories: {
        enabled: doc.featuredCategories.enabled,
        title: doc.featuredCategories.title,
        subtitle: doc.featuredCategories.subtitle
      },
      hostelFeePayment: {
        enabled: doc.hostelFeePayment?.enabled !== false,
        title: doc.hostelFeePayment?.title || 'Pay Hostel Fees',
        subtitle: doc.hostelFeePayment?.subtitle || ''
      },
      heroBanners: serializeHeroBanners(doc)
    });
  } catch (error) {
    console.error('Get Home Settings Error:', error);
    res.status(500).json({ message: 'Error fetching home settings' });
  }
};

/**
 * @desc    Update Home page section settings (Admin)
 * @route   PUT /api/home/settings
 * @access  Admin
 * Body: { topProperties?: { enabled, title, subtitle, propertyIds[] }, featuredCategories?: { enabled, title, subtitle } }
 */
export const updateHomeSettings = async (req, res) => {
  try {
    const { topProperties, featuredCategories, hostelFeePayment, heroBanners } = req.body;
    const doc = await getHomeSettingsDoc();

    if (topProperties) {
      const { enabled, title, subtitle, propertyIds } = topProperties;

      if (typeof enabled === 'boolean') doc.topProperties.enabled = enabled;

      if (title !== undefined) {
        const t = clean(title, 80);
        if (!t) return res.status(400).json({ message: 'Top Properties title cannot be empty' });
        doc.topProperties.title = t;
      }
      if (subtitle !== undefined) doc.topProperties.subtitle = clean(subtitle, 140) ?? '';

      if (propertyIds !== undefined) {
        if (!Array.isArray(propertyIds) || propertyIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
          return res.status(400).json({ message: 'propertyIds must be an array of valid property ids' });
        }
        const unique = [...new Set(propertyIds.map(String))];
        if (unique.length > 20) {
          return res.status(400).json({ message: 'You can select at most 20 top properties' });
        }
        doc.topProperties.propertyIds = unique;
      }
    }

    if (featuredCategories) {
      const { enabled, title, subtitle } = featuredCategories;

      if (typeof enabled === 'boolean') doc.featuredCategories.enabled = enabled;

      if (title !== undefined) {
        const t = clean(title, 80);
        if (!t) return res.status(400).json({ message: 'Featured Categories title cannot be empty' });
        doc.featuredCategories.title = t;
      }
      if (subtitle !== undefined) doc.featuredCategories.subtitle = clean(subtitle, 140) ?? '';
    }

    if (hostelFeePayment) {
      const { enabled, title, subtitle } = hostelFeePayment;
      if (!doc.hostelFeePayment) doc.hostelFeePayment = {};
      if (typeof enabled === 'boolean') doc.hostelFeePayment.enabled = enabled;
      if (title !== undefined) doc.hostelFeePayment.title = clean(title, 80) || 'Pay Hostel Fees';
      if (subtitle !== undefined) doc.hostelFeePayment.subtitle = clean(subtitle, 140) ?? '';
    }

    if (heroBanners !== undefined) {
      const err = applyHeroBanners(doc, heroBanners);
      if (err) return res.status(400).json({ message: err });
    }

    await doc.save();
    res.json({ message: 'Home settings saved' });
  } catch (error) {
    console.error('Update Home Settings Error:', error);
    res.status(400).json({ message: error.message || 'Error saving home settings' });
  }
};
