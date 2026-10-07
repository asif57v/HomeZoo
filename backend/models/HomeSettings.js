import mongoose from 'mongoose';

// Singleton document (key = 'home') holding admin-controlled Home page sections
const homeSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'home',
    unique: true
  },

  topProperties: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Top Properties', trim: true, maxlength: 80 },
    subtitle: { type: String, default: '', trim: true, maxlength: 140 },
    // Order of this array is the display order
    propertyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
  },

  featuredCategories: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Featured Categories', trim: true, maxlength: 80 },
    subtitle: { type: String, default: '', trim: true, maxlength: 140 }
  }
}, { timestamps: true });

const HomeSettings = mongoose.model('HomeSettings', homeSettingsSchema);

export const getHomeSettingsDoc = async () => {
  let doc = await HomeSettings.findOne({ key: 'home' });
  if (!doc) doc = await HomeSettings.create({ key: 'home' });
  return doc;
};

export default HomeSettings;
