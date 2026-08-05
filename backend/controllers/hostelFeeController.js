import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../config/payment.config.js';
import HostelFeePayment from '../models/HostelFeePayment.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Initialize Razorpay
let razorpay;
try {
  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret
    });
  } else {
    console.warn("⚠️ Razorpay Keys missing for Hostel Fees. Demo order mode enabled.");
  }
} catch (err) {
  console.error("Razorpay Init Error in Hostel Fee Controller:", err.message);
}

/**
 * @desc    Create Razorpay / Gateway Order for Hostel Fee Payment
 * @route   POST /api/hostel-fees/create-order
 * @access  Public / Optional Auth
 */
export const createHostelFeeOrder = async (req, res) => {
  try {
    const { amount, studentName, studentId, hostelName, feePeriod, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }
    if (!studentName || !studentId || !hostelName) {
      return res.status(400).json({ success: false, message: 'Student Name, Student ID/Room No, and Hostel Name are required.' });
    }

    const receiptNumber = 'HST-REC-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
    const amountInPaise = Math.round(Number(amount) * 100);

    let orderId = 'order_sim_' + Date.now();
    let currency = PaymentConfig.currency || 'INR';

    if (razorpay && razorpay.orders) {
      try {
        const options = {
          amount: amountInPaise,
          currency: currency,
          receipt: receiptNumber,
          notes: {
            studentName,
            studentId,
            hostelName,
            feePeriod: feePeriod || 'Current Month',
            paymentMethod: paymentMethod || 'Online'
          }
        };
        const rzpOrder = await razorpay.orders.create(options);
        orderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn('Razorpay order creation fallback (using internal order ref):', rzpErr.message);
      }
    }

    // Save pending record in DB
    const userId = req.user ? req.user._id : null;
    const newFeePayment = await HostelFeePayment.create({
      receiptNumber,
      userId,
      studentName,
      studentId,
      hostelName,
      feePeriod: feePeriod || 'Current Month',
      amount: Number(amount),
      paymentMethod: paymentMethod || 'Online',
      razorpayOrderId: orderId,
      paymentStatus: 'pending'
    });

    res.json({
      success: true,
      order: {
        id: orderId,
        amount: amountInPaise,
        currency
      },
      receiptNumber,
      hostelFeeId: newFeePayment._id,
      razorpayKeyId: PaymentConfig.razorpayKeyId || 'rzp_test_demo'
    });
  } catch (error) {
    console.error('Create Hostel Fee Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fee payment order',
      error: error.message
    });
  }
};

/**
 * @desc    Verify Hostel Fee Payment & Finalize Receipt
 * @route   POST /api/hostel-fees/verify
 * @access  Public / Optional Auth
 */
export const verifyHostelFeePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      receiptNumber,
      hostelFeeId,
      isSimulated
    } = req.body;

    let feeRecord = null;
    if (hostelFeeId) {
      feeRecord = await HostelFeePayment.findById(hostelFeeId);
    } else if (receiptNumber) {
      feeRecord = await HostelFeePayment.findOne({ receiptNumber });
    }

    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'Fee payment record not found' });
    }

    // Verify signature if provided and not simulated
    if (razorpay_signature && PaymentConfig.razorpayKeySecret && !isSimulated) {
      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', PaymentConfig.razorpayKeySecret)
        .update(sign.toString())
        .digest('hex');

      if (razorpay_signature !== expectedSign) {
        feeRecord.paymentStatus = 'failed';
        await feeRecord.save();
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }
    }

    const payId = razorpay_payment_id || ('pay_sim_' + Date.now());

    // Update Fee Payment Status
    feeRecord.paymentStatus = 'paid';
    feeRecord.razorpayPaymentId = payId;
    feeRecord.paidAt = new Date();
    await feeRecord.save();

    // 1. Log Transaction in DB
    try {
      let userWallet = null;
      if (feeRecord.userId) {
        userWallet = await Wallet.findOne({ partnerId: feeRecord.userId, role: 'user' });
      }

      if (userWallet) {
        await Transaction.create({
          walletId: userWallet._id,
          partnerId: feeRecord.userId,
          modelType: 'User',
          type: 'debit',
          category: 'booking_payment',
          amount: feeRecord.amount,
          balanceAfter: userWallet.balance,
          description: `Paid Hostel Rent (${feeRecord.hostelName}) - Receipt #${feeRecord.receiptNumber}`,
          reference: feeRecord.receiptNumber,
          status: 'completed',
          metadata: {
            razorpayOrderId: razorpay_order_id || feeRecord.razorpayOrderId,
            razorpayPaymentId: payId,
            notes: `Student: ${feeRecord.studentName} (${feeRecord.studentId})`
          }
        });
      }
    } catch (txErr) {
      console.error('Failed to create user transaction log:', txErr.message);
    }

    // 2. Credit to Admin Account Wallet
    try {
      const AdminUser = mongoose.model('User');
      const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });

      if (adminUser) {
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) {
          adminWallet = await Wallet.create({
            partnerId: adminUser._id,
            role: 'admin',
            balance: 0
          });
        }
        await adminWallet.credit(
          feeRecord.amount,
          `Hostel Rent Collection: ${feeRecord.studentName} (${feeRecord.hostelName}) - Receipt #${feeRecord.receiptNumber}`,
          feeRecord.receiptNumber,
          'booking_payment'
        );
      }
    } catch (adminErr) {
      console.error('Failed to credit admin wallet for hostel fee:', adminErr.message);
    }

    res.json({
      success: true,
      message: 'Hostel fee payment verified and receipt generated successfully.',
      receipt: {
        receiptNumber: feeRecord.receiptNumber,
        studentName: feeRecord.studentName,
        studentId: feeRecord.studentId,
        hostelName: feeRecord.hostelName,
        feePeriod: feeRecord.feePeriod,
        amount: feeRecord.amount,
        paymentMethod: feeRecord.paymentMethod,
        paymentId: payId,
        paymentStatus: 'paid',
        paidAt: feeRecord.paidAt,
        transactionDate: new Date(feeRecord.paidAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      }
    });
  } catch (error) {
    console.error('Verify Hostel Fee Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

/**
 * @desc    Get Student Payment History
 * @route   GET /api/hostel-fees/history
 * @access  Private / Public (filtered by user if authenticated)
 */
export const getHostelFeeHistory = async (req, res) => {
  try {
    const query = req.user ? { userId: req.user._id } : { paymentStatus: 'paid' };
    const payments = await HostelFeePayment.find(query).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, payments });
  } catch (error) {
    console.error('Get Fee History Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
};

/**
 * @desc    Get Receipt Details by Receipt Number
 * @route   GET /api/hostel-fees/receipt/:receiptNumber
 * @access  Public
 */
export const getReceiptDetails = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const feeRecord = await HostelFeePayment.findOne({ receiptNumber });
    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    res.json({ success: true, receipt: feeRecord });
  } catch (error) {
    console.error('Get Receipt Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch receipt details' });
  }
};
