import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    creatorType: {
      type: String,
      enum: ['user', 'vendor'],
      default: 'user',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    videoPublicId: {
      type: String,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number],
      },
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    propertyClicksCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: ['PG', 'Rent', 'Buy', 'Plot', 'General'],
      default: 'General',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected', 'blocked'],
      default: 'published',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

reelSchema.index({ createdAt: -1 });
reelSchema.index({ user: 1, createdAt: -1 });
reelSchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });

const Reel = mongoose.model('Reel', reelSchema);
export default Reel;
