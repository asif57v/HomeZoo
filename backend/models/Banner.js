import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: true
  },
  placement: {
    type: String,
    enum: ['HOME_TOP', 'HOME_MIDDLE', 'CATEGORY_PAGE'],
    default: 'HOME_TOP'
  },
  linkType: {
    type: String,
    enum: ['NONE', 'CATEGORY', 'PROPERTY', 'OFFER', 'EXTERNAL_URL'],
    default: 'NONE'
  },
  linkValue: {
    type: String,
    default: '' // category slug, property id, offer code, or external URL
  },

  // City targeting (empty array = all cities)
  cities: {
    type: [String],
    default: []
  },

  // Scheduling
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },

  // Display order (lower = first)
  priority: {
    type: Number,
    default: 10
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes for performance
bannerSchema.index({ isActive: 1, placement: 1, priority: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
