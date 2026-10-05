import PropertyCategory from '../models/PropertyCategory.js';
import Banner from '../models/Banner.js';
import Offer from '../models/Offer.js';
import Booking from '../models/Booking.js';

/**
 * @desc    Get all home screen data in one call
 * @route   GET /api/home?city=Indore
 * @access  Public (Optional Auth)
 */
export const getHomeData = async (req, res) => {
  try {
    const { city } = req.query;
    const now = new Date();

    // Date filter for banners and offers
    const dateFilter = {
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    };

    // City filter helper
    const cityFilter = city
      ? { $or: [{ cities: { $size: 0 } }, { cities: city }] }
      : {};

    // 1. Popular Categories
    const popularCategories = await PropertyCategory.find({
      isActive: true,
      isPopular: true
    })
      .sort({ popularOrder: 1 })
      .select('name slug displayName icon color image tagline popularOrder');

    // 2. Featured Categories
    const featuredCategories = await PropertyCategory.find({
      isActive: true,
      isFeatured: true
    })
      .sort({ featuredOrder: 1 })
      .select('name slug displayName icon color image tagline bgImage featuredOrder');

    // 3. Banners (grouped by placement)
    const bannerFilter = { ...dateFilter };
    if (city) {
      bannerFilter.$and = [
        { $or: [{ cities: { $size: 0 } }, { cities: city }] }
      ];
    }

    const allBanners = await Banner.find(bannerFilter)
      .sort({ priority: 1, createdAt: -1 })
      .select('-__v');

    const banners = {
      HOME_TOP: allBanners.filter(b => b.placement === 'HOME_TOP'),
      HOME_MIDDLE: allBanners.filter(b => b.placement === 'HOME_MIDDLE')
    };

    // 4. Offers (active, in date range, matching city, showOnHome)
    const offerFilter = {
      ...dateFilter,
      showOnHome: true
    };
    if (city) {
      // Merge the city condition into the existing $or
      offerFilter.$and = [
        { $or: [{ cities: { $size: 0 } }, { cities: city }] }
      ];
    }

    let offers = await Offer.find(offerFilter)
      .sort({ createdAt: -1 })
      .select('-__v');

    // If user is authenticated, filter by userLimit
    if (req.user) {
      const filteredOffers = [];
      for (const offer of offers) {
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });

        if (userUsageCount < (offer.userLimit || 1)) {
          // If firstBookingOnly, check if user has any successful booking
          if (offer.firstBookingOnly) {
            const hasBooked = await Booking.countDocuments({
              userId: req.user._id,
              bookingStatus: { $nin: ['cancelled', 'rejected'] }
            });
            if (hasBooked === 0) {
              filteredOffers.push(offer);
            }
          } else {
            filteredOffers.push(offer);
          }
        }
      }
      offers = filteredOffers;
    }

    res.json({
      popularCategories,
      featuredCategories,
      banners,
      offers
    });
  } catch (error) {
    console.error('Get Home Data Error:', error);
    res.status(500).json({ message: 'Server error fetching home data' });
  }
};
