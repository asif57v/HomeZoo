import express from 'express';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import { rateLimitReelUpload } from '../middlewares/rateLimitReelUpload.js';
import {
  uploadReel,
  getFeed,
  getMostViewed,
  toggleLike,
  toggleSave,
  getSavedReels,
  trackWatch,
  recordPropertyClick,
  setNotInterested,
  addComment,
  getComments,
  shareReel,
  recordView,
  getReelById,
  deleteReel,
} from '../controllers/reelController.js';
import { uploadReelVideo } from '../utils/multer.js';

const router = express.Router();

router.post(
  '/upload',
  protect,
  authorizedRoles('user', 'partner', 'broker', 'agent', 'seller'),
  rateLimitReelUpload,
  uploadReelVideo.single('video'),
  uploadReel
);

router.get('/feed', optionalProtect, getFeed);
router.get('/most-viewed', optionalProtect, getMostViewed);
router.get('/saved', protect, getSavedReels);

router.get('/:id', optionalProtect, getReelById);
router.post('/like/:id', protect, toggleLike);
router.post('/save/:id', protect, toggleSave);
router.post('/:id/track-watch', optionalProtect, trackWatch);
router.post('/:id/property-click', optionalProtect, recordPropertyClick);
router.post('/:id/not-interested', protect, setNotInterested);
router.post('/comment/:id', protect, addComment);
router.get('/:id/comments', optionalProtect, getComments);
router.post('/share/:id', optionalProtect, shareReel);
router.post('/:id/view', optionalProtect, recordView);
router.delete('/:id', protect, deleteReel);

export default router;
