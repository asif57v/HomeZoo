import express from 'express';
import {
  createHostelFeeOrder,
  verifyHostelFeePayment,
  getHostelFeeHistory,
  getReceiptDetails
} from '../controllers/hostelFeeController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create order
router.post('/create-order', optionalProtect, createHostelFeeOrder);

// Verify payment & generate receipt
router.post('/verify', optionalProtect, verifyHostelFeePayment);

// Payment history
router.get('/history', optionalProtect, getHostelFeeHistory);

// Get receipt
router.get('/receipt/:receiptNumber', getReceiptDetails);

export default router;
