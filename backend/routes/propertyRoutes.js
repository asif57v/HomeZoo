import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  createProperty,
  updateProperty,
  addRoomType,
  updateRoomType,
  deleteRoomType,
  upsertDocuments,
  getPublicProperties,
  getPropertyDetails,
  getMyProperties,
  deleteProperty,
  publishDraftProperty,
  revealContact,
  getRecommendedSellers
} from '../controllers/propertyController.js';

const router = express.Router();

router.get('/', getPublicProperties);
router.get('/recommended-sellers', getRecommendedSellers);
router.get('/my', protect, authorizedRoles('partner', 'admin', 'user'), getMyProperties);
router.get('/:id/reveal-contact', revealContact);
router.get('/:id', getPropertyDetails);

router.post('/', protect, authorizedRoles('partner', 'admin', 'user'), createProperty);
router.post('/:id/publish', protect, authorizedRoles('partner', 'admin', 'user'), publishDraftProperty);
router.put('/:id', protect, authorizedRoles('partner', 'admin', 'user'), updateProperty);
router.delete('/:id', protect, authorizedRoles('partner', 'admin', 'user'), deleteProperty);
router.post('/:propertyId/room-types', protect, authorizedRoles('partner', 'admin', 'user'), addRoomType);
router.put('/:propertyId/room-types/:roomTypeId', protect, authorizedRoles('partner', 'admin', 'user'), updateRoomType);
router.delete('/:propertyId/room-types/:roomTypeId', protect, authorizedRoles('partner', 'admin', 'user'), deleteRoomType);
router.post('/:propertyId/documents', protect, authorizedRoles('partner', 'admin', 'user'), upsertDocuments);

export default router;
