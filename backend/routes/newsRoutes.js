import express from 'express';
import {
  getPublicNews,
  getNewsDetails,
  getAllNewsAdmin,
  createNewsArticle,
  updateNewsArticle,
  toggleNewsPublish,
  deleteNewsArticle
} from '../controllers/newsController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Public routes
router.get('/', getPublicNews);
router.get('/:idOrSlug', getNewsDetails);

// Admin routes
router.get('/admin/all', protect, authorizedRoles('admin', 'superadmin'), getAllNewsAdmin);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), createNewsArticle);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), updateNewsArticle);
router.patch('/:id/toggle-publish', protect, authorizedRoles('admin', 'superadmin'), toggleNewsPublish);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteNewsArticle);

export default router;
