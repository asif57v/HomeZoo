import express from 'express';
import { testFcmNotification, registerFcmToken, getFcmStatus } from '../controllers/fcmController.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// FCM Status & Token Stats
router.get('/', optionalProtect, getFcmStatus);
router.get('/status', optionalProtect, getFcmStatus);

// Test FCM notification endpoint (matches POST /api/v1/fcm-tokens/test and POST /api/fcm-tokens/test)
router.post('/test', optionalProtect, testFcmNotification);

// Register / Update FCM Token
router.post('/', optionalProtect, registerFcmToken);
router.put('/', optionalProtect, registerFcmToken);

export default router;
