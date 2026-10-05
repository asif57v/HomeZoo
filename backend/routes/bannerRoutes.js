import express from 'express';
import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
  reorderBanners
} from '../controllers/bannerController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Public
router.get('/', getActiveBanners);

// Admin routes
router.get('/all', protect, authorizedRoles('admin', 'superadmin'), getAllBanners);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), createBanner);
router.put('/reorder', protect, authorizedRoles('admin', 'superadmin'), reorderBanners);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), updateBanner);
router.patch('/:id/toggle-active', protect, authorizedRoles('admin', 'superadmin'), toggleBannerActive);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteBanner);

export default router;
