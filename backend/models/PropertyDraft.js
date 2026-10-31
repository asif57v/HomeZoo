import mongoose from 'mongoose';

// Server-side copy of an in-progress "Add Property" wizard so a partner can
// resume after a crash, app close or cleared app data.
const propertyDraftSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    // e.g. "pg", "hostel", "hotel", "dynamic_<categoryId>"
    draftKey: { type: String, required: true, maxlength: 80 },
    title: { type: String, default: '', maxlength: 160 },
    step: { type: Number, default: 1 },
    totalSteps: { type: Number, default: 0 },
    schemaVersion: { type: Number, default: 1 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Drafts expire after 30 days of no activity
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), index: { expires: 0 } }
  },
  { timestamps: true }
);

propertyDraftSchema.index({ partnerId: 1, draftKey: 1 }, { unique: true });

export default mongoose.model('PropertyDraft', propertyDraftSchema);
