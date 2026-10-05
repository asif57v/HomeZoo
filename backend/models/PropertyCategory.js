import mongoose from 'mongoose';

const propertyCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true
    },
    description: String,

    // UI Configuration
    icon: {
        type: String,
        default: 'Building2'  // Lucide icon name
    },
    image: {
        type: String,
        default: ''  // Image URL for featured category cards
    },
    color: {
        type: String,
        default: '#004F4D'
    },
    badge: String,  // "BUSINESS & LEISURE", "VACATION", etc.
    tagline: {
        type: String,
        default: ''  // Short tagline for featured category cards
    },
    bgImage: {
        type: String,
        default: ''
    },

    // Ordering
    order: {
        type: Number,
        default: 999  // Static tabs will be 0-6
    },

    // Popular Categories (small icon chips/grid on home screen)
    isPopular: {
        type: Boolean,
        default: false
    },
    popularOrder: {
        type: Number,
        default: 999
    },

    // Featured Categories (larger image cards on home screen)
    isFeatured: {
        type: Boolean,
        default: false
    },
    featuredOrder: {
        type: Number,
        default: 999
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Type identifier
    isDynamic: {
        type: Boolean,
        default: true
    },

    // Metadata
    metadata: {
        targetAudience: String,
        features: [String]
    }
}, { timestamps: true });

// Indexes for performance
propertyCategorySchema.index({ slug: 1 });
propertyCategorySchema.index({ isActive: 1 });
propertyCategorySchema.index({ isActive: 1, isPopular: 1, popularOrder: 1 });
propertyCategorySchema.index({ isActive: 1, isFeatured: 1, featuredOrder: 1 });

export default mongoose.model('PropertyCategory', propertyCategorySchema);
