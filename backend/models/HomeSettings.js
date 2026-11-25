import mongoose from 'mongoose';

// Hero banner design per Home tab (All / PG / Rent / Buy / Plot).
// Empty strings mean "use the built-in default" on the frontend.
export const HERO_KEYS = ['all', 'pg', 'rent', 'buy', 'plot'];
export const HERO_DESIGNS = ['classic', 'photo'];

const heroBannerSchema = new mongoose.Schema({
  // classic = gradient + two floating side images; photo = full-width background image
  design: { type: String, enum: HERO_DESIGNS, default: 'classic' },
  title: { type: String, default: '', trim: true, maxlength: 80 },
  subtitle: { type: String, default: '', trim: true, maxlength: 140 },
  gradientFrom: { type: String, default: '', trim: true, maxlength: 20 },
  gradientTo: { type: String, default: '', trim: true, maxlength: 20 },
  accent: { type: String, default: '', trim: true, maxlength: 20 },
  leftImage: { type: String, default: '', trim: true, maxlength: 1000 },
  rightImage: { type: String, default: '', trim: true, maxlength: 1000 },
  bgImage: { type: String, default: '', trim: true, maxlength: 1000 },
  // 0-80: darkness of the overlay on the photo design (keeps text readable)
  overlay: { type: Number, default: 35, min: 0, max: 80 }
}, { _id: false });

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
  },

  hostelFeePayment: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Pay Hostel Fees', trim: true, maxlength: 80 },
    subtitle: { type: String, default: 'Hostel Rent, Mess & Maintenance via UPI', trim: true, maxlength: 140 }
  },

  heroBanners: {
    all: { type: heroBannerSchema, default: () => ({}) },
    pg: { type: heroBannerSchema, default: () => ({}) },
    rent: { type: heroBannerSchema, default: () => ({}) },
    buy: { type: heroBannerSchema, default: () => ({}) },
    plot: { type: heroBannerSchema, default: () => ({}) }
  }
}, { timestamps: true });

const HomeSettings = mongoose.model('HomeSettings', homeSettingsSchema);

export const getHomeSettingsDoc = async () => {
  let doc = await HomeSettings.findOne({ key: 'home' });
  if (!doc) doc = await HomeSettings.create({ key: 'home' });
  return doc;
};

export default HomeSettings;
