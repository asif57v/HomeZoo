import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  uploadImages,
  uploadImagesBase64,
  getAddressFromCoordinates,
  searchLocation,
  calculateDistance,
  deleteImage,
  updatePartnerFcmToken
} from '../controllers/hotelController.js';
import upload from '../utils/multer.js';
import { listDrafts, getDraft, saveDraft, deleteDraft } from '../controllers/propertyDraftController.js';

const router = express.Router();

// Upload routes
router.post('/upload', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user'), upload.array('images', 10), uploadImages);
router.post('/upload-base64', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user'), uploadImagesBase64);
router.post('/delete-image', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user'), deleteImage);
router.post('/location/address', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user'), getAddressFromCoordinates);
router.get('/location/search', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user'), searchLocation);
router.get('/location/distance', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user'), calculateDistance);

// Notification Routes (Reusing userController logic as it handles 'partner' role check)
import { getNotifications, markNotificationRead, deleteNotifications, markAllNotificationsRead, sendTestNotification } from '../controllers/userController.js';

router.get('/notifications', protect, authorizedRoles('partner', 'admin', 'superadmin'), getNotifications);
router.put('/notifications/read-all', protect, authorizedRoles('partner', 'admin', 'superadmin'), markAllNotificationsRead);
router.put('/notifications/:id/read', protect, authorizedRoles('partner', 'admin', 'superadmin'), markNotificationRead);
router.delete('/notifications', protect, authorizedRoles('partner', 'admin', 'superadmin'), deleteNotifications);
router.post('/test-notification', protect, authorizedRoles('partner', 'admin', 'superadmin'), sendTestNotification);

// FCM Token Route - Partner Only
// Property wizard drafts (resume after crash / app close)
router.get('/property-drafts', protect, authorizedRoles('partner'), listDrafts);
router.get('/property-drafts/:key', protect, authorizedRoles('partner'), getDraft);
router.put('/property-drafts/:key', protect, authorizedRoles('partner'), saveDraft);
router.delete('/property-drafts/:key', protect, authorizedRoles('partner'), deleteDraft);

router.put('/fcm-token', protect, authorizedRoles('partner'), updatePartnerFcmToken);

export default router;
