import express from 'express';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getPartnerBookings,
  cancelBooking,
  getPartnerBookingDetail,
  markBookingAsPaid,
  markBookingNoShow,
  markCheckIn,
  markCheckOut,
  getBookingDetail,
  updateInquiryStatus,
  generateViewLead
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/view-lead', optionalProtect, generateViewLead);
router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/partner', protect, authorizedRoles('partner', 'admin', 'user'), getPartnerBookings);
router.get('/:id/partner-detail', protect, authorizedRoles('partner', 'admin', 'user'), getPartnerBookingDetail); // Specific for partners
router.get('/:id', protect, getBookingDetail); // General detail (User)
router.put('/:id/mark-paid', protect, authorizedRoles('partner', 'admin', 'user'), markBookingAsPaid);
router.put('/:id/no-show', protect, authorizedRoles('partner', 'admin', 'user'), markBookingNoShow);
router.put('/:id/check-in', protect, authorizedRoles('partner', 'admin', 'user'), markCheckIn);
router.put('/:id/check-out', protect, authorizedRoles('partner', 'admin', 'user'), markCheckOut);
router.put('/:id/inquiry-status', protect, authorizedRoles('partner', 'admin', 'user'), updateInquiryStatus);
router.post('/:id/cancel', protect, cancelBooking);

export default router;
