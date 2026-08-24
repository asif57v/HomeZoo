import express from 'express';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import { rateLimitReelUpload } from '../middlewares/rateLimitReelUpload.js';
import {
  uploadReel,
  getFeed,
  getMyReels,
  getMostViewed,
  toggleLike,
  toggleSave,
  getSavedReels,
  trackWatch,
  recordPropertyClick,
  setNotInterested,
  addComment,
  deleteComment,
  getComments,
  shareReel,
  recordView,
  getReelById,
  deleteReel,
  getReelDurationSettings,
  quoteReelDuration,
  createReelDurationOrder,
  verifyReelDurationPayment,
} from '../controllers/reelController.js';
import { uploadReelVideo } from '../utils/multer.js';

const router = express.Router();

router.get('/duration-settings', optionalProtect, getReelDurationSettings);
router.post('/duration-quote', optionalProtect, quoteReelDuration);
router.post('/duration-payment/create-order', protect, createReelDurationOrder);
router.post('/duration-payment/verify', protect, verifyReelDurationPayment);

router.post(
  '/upload',
  protect,
  authorizedRoles('user', 'partner', 'broker', 'agent', 'seller', 'admin', 'superadmin'),
  rateLimitReelUpload,
  uploadReelVideo.single('video'),
  uploadReel
);

router.get('/feed', optionalProtect, getFeed);
router.get('/my', protect, getMyReels);
router.get('/most-viewed', optionalProtect, getMostViewed);
router.get('/saved', protect, getSavedReels);

router.get('/:id', optionalProtect, getReelById);
router.post('/like/:id', protect, toggleLike);
router.post('/save/:id', protect, toggleSave);
router.post('/:id/track-watch', optionalProtect, trackWatch);
router.post('/:id/property-click', optionalProtect, recordPropertyClick);
router.post('/:id/not-interested', protect, setNotInterested);
router.post('/comment/:id', protect, addComment);
router.delete('/comment/:commentId', protect, deleteComment);
router.get('/:id/comments', optionalProtect, getComments);
router.post('/share/:id', optionalProtect, shareReel);
router.post('/:id/view', optionalProtect, recordView);
router.delete('/:id', protect, deleteReel);

export default router;
