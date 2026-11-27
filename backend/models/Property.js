// models/Property.js
import mongoose from "mongoose";
import { nextSequence } from "./Counter.js";

/** Short readable prefix per listing type, used in the property code (HZ-PG-1001). */
const CODE_PREFIX = {
  pg: "PG", hostel: "HS", hotel: "HT", resort: "RS", villa: "VL",
  homestay: "HM", tent: "TN", rent: "RN", buy: "BY", plot: "PL"
};

export const makePropertyCode = async (propertyType) => {
  const prefix = CODE_PREFIX[String(propertyType || "").toLowerCase()] || "PR";
  const seq = await nextSequence("propertyCode", 1000);
  return `HZ-${prefix}-${seq}`;
};

const nearbyPlaceSchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    // enum removed to allow flexibilty (bus_stop, restaurant, other, etc.)
  },
  distanceKm: Number
});

const propertySchema = new mongoose.Schema({

  // BASIC INFO
  // Unique readable ID shown to owners, users and admin (e.g. HZ-PG-1001). Set once, never changes.
  propertyCode: { type: String, unique: true, sparse: true, immutable: true },
  propertyName: { type: String, required: true },
  contactNumber: { type: String },
  propertyType: {
    type: String,
    enum: ["villa", "resort", "hotel", "hostel", "pg", "homestay", "tent", "rent", "buy", "plot"],
    required: true
  },

  // Dynamic Category (Optional)
  dynamicCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyCategory",
    default: null
  },

  // Flexible Category-Specific Details (Added for Tent/Glamping support)
  structureDetails: {
    type: Object,
    default: {} // Stores: tentType, bathroomType, electricityInfo, etc.
  },

  pgType: {
    type: String,
    enum: ["boys", "girls", "unisex"]
  },

  hostelType: {
    type: String,
    enum: ["boys", "girls", "mixed"]
  },

  hostLivesOnProperty: { type: Boolean, default: false },
  familyFriendly: { type: Boolean, default: false },

  resortType: {
    type: String,
    enum: ["beach", "hill", "jungle", "desert"]
  },

  hotelCategory: {
    type: String,
    enum: ["Budget", "Premium", "Luxury"]
  },
  starRating: {
    type: Number,
    min: 1,
    max: 7
  },

  activities: [String],

  description: String,
  shortDescription: String,

  // OWNER
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    required: true
  },

  // LOCATION
  address: {
    country: String,
    state: String,
    city: String,
    area: String,
    fullAddress: String,
    pincode: String
  },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number]
  },

  nearbyPlaces: {
    type: [nearbyPlaceSchema],
    default: []
  },

  // MEDIA
  coverImage: { type: String, required: true },
  propertyImages: [String],

  // AMENITIES (PROPERTY LEVEL)
  amenities: [String],

  // POLICIES
  checkInTime: String,
  checkOutTime: String,
  cancellationPolicy: String,
  houseRules: [String],

  // --- NEW PROPERTY SPECIFIC FIELDS ---

  // PG/Co-Living Details
  pgDetails: {
    occupancy: { type: String, enum: ['Single', 'Double', 'Triple', 'Other'] },
    gender: { type: String, enum: ['Boys', 'Girls', 'Co-ed'] },
    minStay: String,
    noticePeriod: String,
    securityDeposit: Number,
    availableFrom: Date,
    foodIncluded: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false }
    },
    rules: {
      smoking: Boolean,
      drinking: Boolean,
      visitors: Boolean,
      curfew: String,
      ageRange: String
    }
  },

  // Rent Details
  rentDetails: {
    type: { type: String }, // 1BHK, 2BHK etc.
    monthlyRent: { type: Number }, // Added Price
    furnishing: { type: String, enum: ['Fully', 'Semi', 'Unfurnished'] },
    tenantPreference: { type: String }, // Family, Bachelors, etc.
    builtYear: Number,
    securityDeposit: Number,
    maintenanceCharges: Number,
    electricityIncluded: Boolean,
    waterSupply: String,
    societyName: String,
    lift: Boolean
  },

  // Buy Details
  buyDetails: {
    type: { type: String }, // Apartment, Villa
    expectedPrice: { type: Number }, // Added Price
    area: {
      superBuiltUp: Number,
      carpet: Number,
      unit: { type: String, default: 'sqft' }
    },
    ownership: String,
    propertyAge: String,
    floor: {
      current: Number,
      total: Number
    },
    facing: String,
    registrationIncluded: Boolean,
    stampDutyIncluded: Boolean,
    propertyTax: Number,
    legalVerified: Boolean,
    loanEligible: Boolean,
    builderName: String
  },

  // Plot Details
  plotDetails: {
    expectedPrice: { type: Number }, // Added Price
    plotArea: { type: Number },
    unit: { type: String, default: 'sqyrd' },
    dimensions: { length: Number, breadth: Number }, // ft
    facing: String,
    landType: { type: String }, // Residential, Commercial
    roadWidth: String,
    boundaryMarked: Boolean,
    approvalAuthority: String,
    soilType: String,
    electricityAvailable: Boolean,
    waterSource: String,
    nearbyLandmark: String
  },

  // Universal / Pro Fields
  videoUrl: String,
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  isNegotiable: { type: Boolean, default: false },
  virtualTourLink: String,
  availabilityStatus: { type: String, enum: ['Available', 'Sold', 'Rented'], default: 'Available' },

  // STATUS
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "draft"
  },

  isLive: { type: Boolean, default: false },
  // First time admin approved the listing; drives the "New" tag window
  approvedAt: { type: Date },

  // RATINGS
  avgRating: { type: Number, default: 3 },
  totalReviews: { type: Number, default: 0 }

}, { timestamps: true });

propertySchema.index({ location: "2dsphere" });

// Every new property gets its unique code automatically
propertySchema.pre("validate", async function () {
  if (!this.propertyCode) this.propertyCode = await makePropertyCode(this.propertyType);
});

const Property = mongoose.model("Property", propertySchema);

/**
 * Gives a code to properties created before propertyCode existed (oldest first).
 * Runs on server start; does nothing once every property has a code.
 */
export const backfillPropertyCodes = async () => {
  const missing = await Property.find({ propertyCode: { $exists: false } })
    .sort({ createdAt: 1 }).select("_id propertyType").lean();
  for (const p of missing) {
    const code = await makePropertyCode(p.propertyType);
    await Property.updateOne({ _id: p._id, propertyCode: { $exists: false } }, { $set: { propertyCode: code } });
  }
  return missing.length;
};

export default Property;
