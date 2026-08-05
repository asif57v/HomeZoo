import express from 'express';
import {
  createHostelFeeOrder,
  verifyHostelFeePayment,
  getHostelFeeHistory,
  getReceiptDetails
} from '../controllers/hostelFeeController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create order
router.post('/create-order', optionalAuth, createHostelFeeOrder);

// Verify payment & generate receipt
router.post('/verify', optionalAuth, verifyHostelFeePayment);

// Payment history
router.get('/history', optionalAuth, getHostelFeeHistory);

// Get receipt
router.get('/receipt/:receiptNumber', getReceiptDetails);

export default router;
