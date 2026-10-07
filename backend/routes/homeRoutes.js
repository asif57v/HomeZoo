import express from 'express';
import { getHomeData } from '../controllers/homeController.js';
import { getAdminHomeSettings, updateHomeSettings } from '../controllers/homeSettingsController.js';
import { optionalProtect, protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/home?city=Indore
router.get('/', optionalProtect, getHomeData);

// Admin: Home page section settings (Top Properties, Featured Categories heading)
router.get('/settings', protect, authorizedRoles('admin', 'superadmin'), getAdminHomeSettings);
router.put('/settings', protect, authorizedRoles('admin', 'superadmin'), updateHomeSettings);

export default router;
