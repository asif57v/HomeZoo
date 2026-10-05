import Offer from '../models/Offer.js';
import Booking from '../models/Booking.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * @desc    Get active offers for users
 * @route   GET /api/offers
 * @access  Public (Optional Auth)
 */
export const getActiveOffers = async (req, res) => {
  try {
    const { city } = req.query;
    const now = new Date();

    const filter = {
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    };

    // City filtering
    if (city) {
      filter.$and = [
        { $or: [{ cities: { $size: 0 } }, { cities: city }] }
      ];
    }

    let offers = await Offer.find(filter).sort({ createdAt: -1 });

    // Seed default if empty
    if (offers.length === 0) {
      const seedOffers = [
        {
          title: "New User Special",
          subtitle: "Flat ₹100 Off on your first booking",
          description: "Applicable on all hotels for new users.",
          code: "NEWRUKKO",
          discountType: "flat",
          discountValue: 100,
          minBookingAmount: 500,
          image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80",
          bg: "bg-[#004F4D]",
          btnText: "Apply Now",
          userLimit: 1,
          showOnHome: true
        },
        {
          title: "Winter Wonderland",
          subtitle: "Get 15% Off up to ₹500",
          description: "Special winter discount for premium stays.",
          code: "WINTER15",
          discountType: "percentage",
          discountValue: 15,
          maxDiscount: 500,
          minBookingAmount: 1000,
          image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80",
          bg: "bg-[#1A1A1A]",
          btnText: "Grab Deal",
          userLimit: 2,
          showOnHome: true
        }
      ];

      for (const so of seedOffers) {
        const exists = await Offer.findOne({ code: so.code });
        if (!exists) {
          await Offer.create(so);
        }
      }

      const freshOffers = await Offer.find({ isActive: true });
      return res.json(freshOffers);
    }

    // Filter by userLimit if user is logged in
    if (req.user) {
      const filteredOffers = [];
      for (const offer of offers) {
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });

        if (userUsageCount < (offer.userLimit || 1)) {
          filteredOffers.push(offer);
        }
      }
      return res.json(filteredOffers);
    }

    res.json(offers);
  } catch (error) {
    console.error('Get Offers Error:', error);
    res.status(500).json({ message: 'Server error fetching offers' });
  }
};

/**
 * @desc    Validate an offer code (enhanced with city, category, firstBookingOnly)
 * @route   POST /api/offers/validate
 * @access  Private
 */
export const validateOffer = async (req, res) => {
  try {
    const { code, bookingAmount, categoryId, city } = req.body;

    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const offer = await Offer.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!offer) {
      return res.status(404).json({ message: "Invalid coupon code or expired" });
    }

    // 1. Date Check
    const now = new Date();
    if (offer.startDate > now || (offer.endDate && new Date(offer.endDate).setHours(23, 59, 59, 999) < now.getTime())) {
      return res.status(400).json({ message: "Coupon has expired or is not yet active" });
    }

    // 2. Min Amount Check
    if (bookingAmount < offer.minBookingAmount) {
      return res.status(400).json({ message: `Minimum booking amount should be ₹${offer.minBookingAmount}` });
    }

    // 3. Overall Usage Limit
    if (offer.usageCount >= offer.usageLimit) {
      return res.status(400).json({ message: "Coupon limit reached" });
    }

    // 4. User Usage Limit
    const userUsageCount = await Booking.countDocuments({
      userId: req.user._id,
      couponCode: offer.code,
      bookingStatus: { $nin: ['cancelled', 'rejected'] }
    });

    if (userUsageCount >= (offer.userLimit || 1)) {
      return res.status(400).json({ message: `You have reached the usage limit for this coupon (${offer.userLimit || 1} time(s))` });
    }

    // 5. City Check
    if (city && offer.cities && offer.cities.length > 0) {
      if (!offer.cities.includes(city)) {
        return res.status(400).json({ message: `This coupon is not valid in ${city}` });
      }
    }

    // 6. Category Check
    if (categoryId && offer.applicableCategories && offer.applicableCategories.length > 0) {
      const catMatch = offer.applicableCategories.some(c => c.toString() === categoryId);
      if (!catMatch) {
        return res.status(400).json({ message: "This coupon is not applicable for this category" });
      }
    }

    // 7. First Booking Only Check
    if (offer.firstBookingOnly) {
      const hasBooked = await Booking.countDocuments({
        userId: req.user._id,
        bookingStatus: { $nin: ['cancelled', 'rejected'] }
      });
      if (hasBooked > 0) {
        return res.status(400).json({ message: "This coupon is only for first-time bookings" });
      }
    }

    // Calculate Discount
    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (bookingAmount * offer.discountValue) / 100;
      if (offer.maxDiscount && discount > offer.maxDiscount) {
        discount = offer.maxDiscount;
      }
    } else {
      discount = offer.discountValue;
    }

    // NOTE: usageCount is NOT incremented here - only after successful payment

    res.json({
      success: true,
      offerCode: offer.code,
      discount: Math.floor(discount),
      finalAmount: Math.floor(bookingAmount - discount),
      description: offer.description || offer.subtitle
    });

  } catch (error) {
    console.error('Validate Offer Error:', error);
    res.status(500).json({ message: 'Server error validating offer' });
  }
};

/**
 * @desc    Create an offer (Admin)
 */
export const createOffer = async (req, res) => {
  try {
    const offerData = { ...req.body };

    // Parse JSON arrays if sent as strings (from FormData)
    if (typeof offerData.cities === 'string') {
      try { offerData.cities = JSON.parse(offerData.cities); } catch (e) { offerData.cities = []; }
    }
    if (typeof offerData.applicableCategories === 'string') {
      try { offerData.applicableCategories = JSON.parse(offerData.applicableCategories); } catch (e) { offerData.applicableCategories = []; }
    }

    // Handle boolean fields from FormData
    if (offerData.showOnHome !== undefined) offerData.showOnHome = offerData.showOnHome === true || offerData.showOnHome === 'true';
    if (offerData.firstBookingOnly !== undefined) offerData.firstBookingOnly = offerData.firstBookingOnly === true || offerData.firstBookingOnly === 'true';

    // If a file was uploaded via multer, upload to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'offers');
      offerData.image = result.url;
    }

    const offer = new Offer(offerData);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    console.error('Create Offer Error:', error);
    res.status(400).json({ message: error.message || 'Error creating offer' });
  }
};

/**
 * @desc    Get all offers for Admin (with pagination + search)
 */
export const getAllOffers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const now = new Date();
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    } else if (status === 'live') {
      filter.isActive = true;
      filter.startDate = { $lte: now };
      filter.$or = [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }];
    } else if (status === 'scheduled') {
      filter.isActive = true;
      filter.startDate = { $gt: now };
    } else if (status === 'expired') {
      filter.endDate = { $lt: now, $ne: null };
    }

    const [offers, total] = await Promise.all([
      Offer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Offer.countDocuments(filter)
    ]);

    res.json({
      offers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offers' });
  }
};

/**
 * @desc    Update an offer (Admin)
 */
export const updateOffer = async (req, res) => {
  try {
    const offerData = { ...req.body };

    if (typeof offerData.cities === 'string') {
      try { offerData.cities = JSON.parse(offerData.cities); } catch (e) { offerData.cities = []; }
    }
    if (typeof offerData.applicableCategories === 'string') {
      try { offerData.applicableCategories = JSON.parse(offerData.applicableCategories); } catch (e) { offerData.applicableCategories = []; }
    }
    if (offerData.showOnHome !== undefined) offerData.showOnHome = offerData.showOnHome === true || offerData.showOnHome === 'true';
    if (offerData.firstBookingOnly !== undefined) offerData.firstBookingOnly = offerData.firstBookingOnly === true || offerData.firstBookingOnly === 'true';

    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'offers');
      offerData.image = result.url;
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, offerData, { new: true, runValidators: true });
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    res.json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error updating offer' });
  }
};

/**
 * @desc    Delete an offer (Admin)
 */
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting offer' });
  }
};

/**
 * @desc    Toggle offer active status (Admin)
 * @route   PATCH /api/offers/:id/toggle-active
 * @access  Admin
 */
export const toggleOfferActive = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    offer.isActive = !offer.isActive;
    await offer.save();
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling offer status' });
  }
};
