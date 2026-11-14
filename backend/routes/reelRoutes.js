import express from 'express';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import { requireRazorpayEnabled } from '../middlewares/featureGuards.js';
import { rateLimitReelUpload } from '../middlewares/rateLimitReelUpload.js';
import {
  uploadReel,
  getReelUploadSignature,
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

// Safe multer wrapper for reel video upload that catches errors and avoids connection reset
const uploadReelMiddleware = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return next();
  }

  uploadReelVideo.single('video')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer Reel Upload Error:', err);
      try {
        if (req.readable) req.resume();
      } catch (_) {}
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'Video file size exceeds the 60MB limit. Please choose a shorter or smaller video.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error processing video upload',
      });
    }
    next();
  });
};

router.get('/duration-settings', optionalProtect, getReelDurationSettings);
router.post('/duration-quote', optionalProtect, quoteReelDuration);
router.post('/duration-payment/create-order', protect, requireRazorpayEnabled, createReelDurationOrder);
router.post('/duration-payment/verify', protect, verifyReelDurationPayment);

router.get(
  '/upload-signature',
  protect,
  authorizedRoles('user', 'partner', 'broker', 'agent', 'seller', 'admin', 'superadmin'),
  getReelUploadSignature
);

router.post(
  '/upload',
  protect,
  authorizedRoles('user', 'partner', 'broker', 'agent', 'seller', 'admin', 'superadmin'),
  rateLimitReelUpload,
  uploadReelMiddleware,
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
