import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { getHomeSettingsDoc } from '../models/HomeSettings.js';

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

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
      }
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
    const { topProperties, featuredCategories } = req.body;
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

    await doc.save();
    res.json({ message: 'Home settings saved' });
  } catch (error) {
    console.error('Update Home Settings Error:', error);
    res.status(400).json({ message: error.message || 'Error saving home settings' });
  }
};
