import Banner from '../models/Banner.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * @desc    Get banners for a placement (Public, with city + date filtering)
 * @route   GET /api/banners?placement=HOME_TOP&city=Indore
 * @access  Public
 */
export const getActiveBanners = async (req, res) => {
  try {
    const { placement, city } = req.query;
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

    if (placement) filter.placement = placement;

    // City filtering: show banners with no cities specified (all cities) or matching city
    if (city) {
      filter.$and = [
        { $or: [{ cities: { $size: 0 } }, { cities: city }] }
      ];
    }

    const banners = await Banner.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .select('-__v');

    res.json(banners);
  } catch (error) {
    console.error('Get Active Banners Error:', error);
    res.status(500).json({ message: 'Server error fetching banners' });
  }
};

/**
 * @desc    Get all banners (Admin, with pagination + search)
 * @route   GET /api/banners/all?page=1&limit=20&search=&status=
 * @access  Admin
 */
export const getAllBanners = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } }
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
      filter.endDate = { $lt: now };
    }

    const [banners, total] = await Promise.all([
      Banner.find(filter).sort({ priority: 1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Banner.countDocuments(filter)
    ]);

    res.json({
      banners,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get All Banners Error:', error);
    res.status(500).json({ message: 'Error fetching banners' });
  }
};

/**
 * @desc    Create a banner (Admin)
 * @route   POST /api/banners
 * @access  Admin
 */
export const createBanner = async (req, res) => {
  try {
    const bannerData = { ...req.body };

    // Parse JSON arrays if sent as strings (from FormData)
    if (typeof bannerData.cities === 'string') {
      try { bannerData.cities = JSON.parse(bannerData.cities); } catch (e) { bannerData.cities = []; }
    }

    // If a file was uploaded, upload to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'banners');
      bannerData.image = result.url;
    }

    const banner = new Banner(bannerData);
    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    console.error('Create Banner Error:', error);
    res.status(400).json({ message: error.message || 'Error creating banner' });
  }
};

/**
 * @desc    Update a banner (Admin)
 * @route   PUT /api/banners/:id
 * @access  Admin
 */
export const updateBanner = async (req, res) => {
  try {
    const bannerData = { ...req.body };

    if (typeof bannerData.cities === 'string') {
      try { bannerData.cities = JSON.parse(bannerData.cities); } catch (e) { bannerData.cities = []; }
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'banners');
      bannerData.image = result.url;
    }

    const banner = await Banner.findByIdAndUpdate(req.params.id, bannerData, { new: true, runValidators: true });
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    res.json(banner);
  } catch (error) {
    console.error('Update Banner Error:', error);
    res.status(400).json({ message: error.message || 'Error updating banner' });
  }
};

/**
 * @desc    Delete a banner (Admin)
 * @route   DELETE /api/banners/:id
 * @access  Admin
 */
export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Delete Banner Error:', error);
    res.status(500).json({ message: 'Error deleting banner' });
  }
};

/**
 * @desc    Toggle banner active status (Admin)
 * @route   PATCH /api/banners/:id/toggle-active
 * @access  Admin
 */
export const toggleBannerActive = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();

    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling banner status' });
  }
};

/**
 * @desc    Bulk reorder banners (Admin)
 * @route   PUT /api/banners/reorder
 * @access  Admin
 */
export const reorderBanners = async (req, res) => {
  try {
    const { banners } = req.body; // Array of { id, priority }

    const updates = banners.map(({ id, priority }) =>
      Banner.findByIdAndUpdate(id, { priority })
    );

    await Promise.all(updates);
    res.json({ message: 'Banners reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
