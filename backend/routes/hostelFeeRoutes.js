import express from 'express';
import {
  createHostelFeeOrder,
  verifyHostelFeePayment,
  getHostelFeeHistory,
  getReceiptDetails
} from '../controllers/hostelFeeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRazorpayEnabled } from '../middlewares/featureGuards.js';

const router = express.Router();

// Create order (login required: guests can browse the site but must login to pay)
router.post('/create-order', protect, requireRazorpayEnabled, createHostelFeeOrder);

// Verify payment & generate receipt
router.post('/verify', protect, verifyHostelFeePayment);

// Payment history
router.get('/history', protect, getHostelFeeHistory);

// Get receipt
router.get('/receipt/:receiptNumber', getReceiptDetails);

export default router;
