import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    maxProperties: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    durationDays: {
        type: Number,
        required: true,
    },
    commissionPercentage: {
        type: Number,
        default: 10, // Default commission if not specified
        min: 0,
        max: 100
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    tier: {
        type: String,
        enum: ['silver', 'gold_basic', 'gold', 'platinum', 'diamond'],
        required: true
    },
    leadCap: {
        type: Number,
        default: 0 // 0 for unlimited
    },
    hasVerifiedTag: {
        type: Boolean,
        default: false
    },
    // Shows the "PREMIUM LISTING" badge on the partner's property cards
    hasPremiumTag: {
        type: Boolean,
        default: false
    },
    // Property types the Verified / Premium badges apply to. Empty = all types.
    badgePropertyTypes: {
        type: [String],
        enum: ["villa", "resort", "hotel", "hostel", "pg", "homestay", "tent", "rent", "buy", "plot"],
        default: []
    },
    bannerType: {
        type: String,
        enum: ['none', 'locality', 'city'],
        default: 'none'
    },
    rankingWeight: {
        type: Number,
        default: 1 // Diamond=5, Platinum=4, Gold=3, GoldBasic=2, Silver=1
    },
    pauseDaysAllowed: {
        type: Number,
        default: 0
    }
}, { timestamps: true });


const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
