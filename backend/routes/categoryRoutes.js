import express from 'express';
import {
    getActiveCategories,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    toggleCategoryActive,
    toggleCategoryPopular,
    toggleCategoryFeatured,
    reorderPopularCategories,
    reorderFeaturedCategories
} from '../controllers/categoryController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCategories);

// Admin routes - Protected
router.get('/all', protect, authorizedRoles('admin', 'superadmin'), getAllCategories);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), createCategory);
router.put('/reorder', protect, authorizedRoles('admin', 'superadmin'), reorderCategories);
router.put('/reorder-popular', protect, authorizedRoles('admin', 'superadmin'), reorderPopularCategories);
router.put('/reorder-featured', protect, authorizedRoles('admin', 'superadmin'), reorderFeaturedCategories);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), updateCategory);
router.patch('/:id/toggle-active', protect, authorizedRoles('admin', 'superadmin'), toggleCategoryActive);
router.patch('/:id/toggle-popular', protect, authorizedRoles('admin', 'superadmin'), toggleCategoryPopular);
router.patch('/:id/toggle-featured', protect, authorizedRoles('admin', 'superadmin'), toggleCategoryFeatured);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteCategory);

export default router;
