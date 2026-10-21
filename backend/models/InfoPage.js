import mongoose from 'mongoose';

export const INFO_PAGE_SLUGS = ['terms', 'privacy', 'support', 'about', 'contact'];

const infoPageSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['user', 'partner'],
      required: true
    },
    slug: {
      type: String,
      enum: INFO_PAGE_SLUGS,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    // Contact details shown on the Support page (only used when slug === 'support')
    supportEmail: { type: String, trim: true, default: '' },
    supportPhone: { type: String, trim: true, default: '' },
    supportWhatsapp: { type: String, trim: true, default: '' },
    supportHours: { type: String, trim: true, default: '' },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  { timestamps: true }
);

infoPageSchema.index({ audience: 1, slug: 1 }, { unique: true });

const InfoPage = mongoose.model('InfoPage', infoPageSchema);
export default InfoPage;

