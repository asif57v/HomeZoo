import Reel from '../models/Reel.js';
import ReelLike from '../models/ReelLike.js';
import ReelSave from '../models/ReelSave.js';
import ReelComment from '../models/ReelComment.js';
import ReelInteraction from '../models/ReelInteraction.js';
import Property from '../models/Property.js';
import mongoose from 'mongoose';
import {
  uploadVideoToCloudinary,
  getVideoThumbnailUrl,
  deleteVideoFromCloudinary,
} from '../utils/cloudinary.js';
import {
  REEL_WEIGHTS,
  updateUserReelPreferences,
  resolveWatchPreferenceWeight,
  buildPersonalizedFeed,
} from '../utils/reelRecommendation.js';
import PlatformSettings from '../models/PlatformSettings.js';
import ReelDurationPayment from '../models/ReelDurationPayment.js';
import PaymentConfig from '../config/payment.config.js';
import {
  resolveReelDurationCharge,
  publicReelDurationSettings,
  resolveUploaderType,
} from '../utils/reelDurationPricing.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';

const MAX_CAPTION_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;
/** Allow ±1s drift between client metadata and Cloudinary duration vs paid order */
const DURATION_MATCH_TOLERANCE_SEC = 1;

let razorpay;
try {
  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret,
    });
  } else {
    razorpay = null;
  }
} catch {
  razorpay = null;
}

function resolveUserModel(user) {
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const vendorRoles = ['partner', 'broker', 'agent', 'seller'];
  if (isAdmin) return { creatorType: 'admin', userModel: 'Admin' };
  if (vendorRoles.includes(user.role)) return { creatorType: 'vendor', userModel: 'Partner' };
  return { creatorType: 'user', userModel: 'User' };
}

/**
 * Consume a paid (unused) duration payment for this user + actual duration.
 * Returns payment doc or throws HTTP-ish error object { status, message }.
 */
async function consumeDurationPayment({
  userId,
  userModel,
  durationSec,
  paymentId,
  razorpayOrderId,
  razorpayPaymentId,
  uploaderType,
}) {
  let payment = null;

  if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
    payment = await ReelDurationPayment.findById(paymentId);
  } else if (razorpayOrderId) {
    payment = await ReelDurationPayment.findOne({ razorpayOrderId: String(razorpayOrderId) });
  } else if (razorpayPaymentId) {
    payment = await ReelDurationPayment.findOne({ razorpayPaymentId: String(razorpayPaymentId) });
  }

  if (!payment) {
    const err = new Error('Valid duration payment is required for this Reel length');
    err.status = 402;
    throw err;
  }

  if (payment.user.toString() !== userId.toString()) {
    const err = new Error('Payment does not belong to this user');
    err.status = 403;
    throw err;
  }

  if (payment.paymentStatus === 'used') {
    const err = new Error('This payment has already been used for another Reel');
    err.status = 400;
    throw err;
  }

  if (payment.paymentStatus !== 'paid') {
    const err = new Error('Payment is not completed. Please complete payment and try again.');
    err.status = 402;
    throw err;
  }

  if (uploaderType && payment.uploaderType && payment.uploaderType !== uploaderType) {
    const err = new Error('This payment was created for a different uploader type');
    err.status = 400;
    throw err;
  }

  // Actual video must be covered by the paid tier (snapshot), with small tolerance
  const coveredMax = Number(payment.appliedTiernapshot?.maxDuration ?? payment.durationSec);
  const freeSnap = Number(payment.freeDurationSnapshot || 0);

  if (durationSec > coveredMax + DURATION_MATCH_TOLERANCE_SEC) {
    const err = new Error(
      `Video duration (${durationSec}s) exceeds the paid tier max (${coveredMax}s). Payment does not cover this video.`
    );
    err.status = 400;
    throw err;
  }

  // Paid orders are only for videos above free duration
  if (durationSec <= freeSnap) {
    const err = new Error(
      'This video is within free duration; a paid duration receipt is not required (and cannot be applied).'
    );
    err.status = 400;
    throw err;
  }

  // Mark used atomically
  const updated = await ReelDurationPayment.findOneAndUpdate(
    { _id: payment._id, paymentStatus: 'paid' },
    { $set: { paymentStatus: 'used', usedAt: new Date() } },
    { new: true }
  );

  if (!updated) {
    const err = new Error('This payment has already been used for another Reel');
    err.status = 400;
    throw err;
  }

  return updated;
}

/** Sanitize caption for storage: trim, strip control chars, normalize whitespace, max length */
function sanitizeCaption(input) {
  if (input == null || typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CAPTION_LENGTH);
}

/**
 * GET /api/reels/duration-settings
 * Returns the logged-in uploader's role config (user vs vendor). Guests get user config.
 */
export const getReelDurationSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const uploaderType = resolveUploaderType(req.user);
    res.json({
      success: true,
      uploaderType,
      settings: publicReelDurationSettings(settings, uploaderType),
    });
  } catch (err) {
    console.error('Get reel duration settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reel duration settings' });
  }
};

/**
 * POST /api/reels/duration-quote
 * Body: { duration } — UI-only quote. Role and price are calculated server-side.
 * Client cannot pick price or uploader type.
 */
export const quoteReelDuration = async (req, res) => {
  try {
    const duration = Math.ceil(Number(req.body.duration) || 0);
    const settings = await PlatformSettings.getSettings();
    const uploaderType = resolveUploaderType(req.user);
    const quote = resolveReelDurationCharge(duration, settings, uploaderType);
    res.json({
      success:
        quote.ok ||
        quote.code === 'OVER_MAX' ||
        quote.code === 'PAID_DISABLED' ||
        quote.code === 'NO_TIER' ||
        quote.code === 'ROLE_INACTIVE',
      uploaderType,
      quote,
      settings: publicReelDurationSettings(settings, uploaderType),
    });
  } catch (err) {
    console.error('Quote reel duration error:', err);
    res.status(500).json({ success: false, message: 'Failed to calculate duration charge' });
  }
};

/**
 * POST /api/reels/duration-payment/create-order
 * Body: { duration } — amount is calculated server-side from the uploader's role config.
 */
export const createReelDurationOrder = async (req, res) => {
  try {
    const duration = Math.ceil(Number(req.body.duration) || 0);
    const settings = await PlatformSettings.getSettings();
    const uploaderType = resolveUploaderType(req.user);
    const quote = resolveReelDurationCharge(duration, settings, uploaderType);

    if (!quote.ok) {
      return res.status(400).json({ success: false, message: quote.message, quote });
    }
    if (!quote.requiresPayment || quote.charge <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No payment required for this duration',
        quote,
      });
    }

    const { userModel } = resolveUserModel(req.user);
    const amountInPaise = Math.round(quote.charge * 100);

    let orderId;
    let orderAmount = amountInPaise;
    let currency = PaymentConfig.currency || 'INR';

    if (razorpay && razorpay.orders) {
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `reel_dur_${Date.now()}`.slice(0, 40),
        notes: {
          type: 'reel_duration_charge',
          userId: req.user._id.toString(),
          uploaderType,
          durationSec: String(quote.duration),
          amount: String(quote.charge),
        },
      });
      orderId = order.id;
      orderAmount = order.amount;
      currency = order.currency;
    } else {
      orderId = `order_sim_reel_${Date.now()}`;
    }

    const payment = await ReelDurationPayment.create({
      user: req.user._id,
      userModel,
      uploaderType,
      durationSec: quote.duration,
      amount: quote.charge,
      currency,
      freeDurationSnapshot: quote.freeDuration,
      maxDurationSnapshot: quote.maxDuration,
      appliedTiernapshot: quote.appliedTier,
      razorpayOrderId: orderId,
      paymentStatus: 'pending',
    });

    res.json({
      success: true,
      paymentId: payment._id,
      uploaderType,
      order: {
        id: orderId,
        amount: orderAmount,
        currency,
      },
      quote,
      razorpayKeyId: PaymentConfig.razorpayKeyId || 'rzp_test_demo',
    });
  } catch (err) {
    console.error('Create reel duration order error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create duration payment order',
    });
  }
};

/**
 * POST /api/reels/duration-payment/verify
 * Verifies Razorpay signature; marks payment paid (does not publish Reel).
 */
export const verifyReelDurationPayment = async (req, res) => {
  try {
    const {
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const payment = paymentId
      ? await ReelDurationPayment.findById(paymentId)
      : await ReelDurationPayment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Duration payment record not found' });
    }
    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (payment.paymentStatus === 'paid' || payment.paymentStatus === 'used') {
      return res.json({
        success: true,
        alreadyVerified: true,
        paymentId: payment._id,
        paymentStatus: payment.paymentStatus,
        amount: payment.amount,
        durationSec: payment.durationSec,
      });
    }

    const isSimulated =
      String(razorpay_order_id || payment.razorpayOrderId || '').startsWith('order_sim_') ||
      !PaymentConfig.razorpayKeySecret;

    if (!isSimulated) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
      }
      const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto
        .createHmac('sha256', PaymentConfig.razorpayKeySecret)
        .update(sign)
        .digest('hex');
      if (expected !== razorpay_signature) {
        payment.paymentStatus = 'failed';
        await payment.save();
        return res.status(400).json({
          success: false,
          message: 'Payment failed. Your Reel has not been published.',
        });
      }
      payment.razorpayOrderId = razorpay_order_id;
      payment.razorpayPaymentId = razorpay_payment_id;
    } else {
      payment.razorpayPaymentId =
        razorpay_payment_id || `pay_sim_reel_${Date.now()}`;
      if (razorpay_order_id) payment.razorpayOrderId = razorpay_order_id;
    }

    payment.paymentStatus = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    res.json({
      success: true,
      paymentId: payment._id,
      paymentStatus: 'paid',
      amount: payment.amount,
      durationSec: payment.durationSec,
      appliedTier: payment.appliedTiernapshot,
    });
  } catch (err) {
    console.error('Verify reel duration payment error:', err);
    // Duplicate razorpayPaymentId
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This payment was already recorded',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Payment verification failed. Your Reel has not been published.',
    });
  }
};

/**
 * POST /api/reels/upload
 * Duration limits & pricing from Admin PlatformSettings. Payment verified server-side when required.
 */
export const uploadReel = async (req, res) => {
  let filePath = null;
  let uploadedPublicId = null;
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }
    filePath = req.file.path;
    const rawCaption = req.body.caption != null ? String(req.body.caption) : '';
    const caption = sanitizeCaption(rawCaption);

    const uploadResult = await uploadVideoToCloudinary(filePath, 'reels');
    filePath = null; // cleaned by cloudinary util
    uploadedPublicId = uploadResult.publicId;

    const rawDuration = uploadResult.duration != null ? Number(uploadResult.duration) : null;
    if (rawDuration == null || !Number.isFinite(rawDuration) || rawDuration <= 0) {
      await deleteVideoFromCloudinary(uploadResult.publicId);
      return res.status(400).json({
        success: false,
        message: 'Could not determine video duration. Please try another file.',
      });
    }

    const durationSec = Math.ceil(rawDuration);
    const settings = await PlatformSettings.getSettings();
    const uploaderType = resolveUploaderType(req.user);
    const quote = resolveReelDurationCharge(durationSec, settings, uploaderType);

    if (!quote.ok) {
      await deleteVideoFromCloudinary(uploadResult.publicId);
      return res.status(400).json({ success: false, message: quote.message, quote });
    }

    let durationPaymentDoc = null;
    let durationPaymentStatus = 'free';
    let durationCharge = 0;
    let durationTierSnapshot = null;

    if (quote.requiresPayment && quote.charge > 0) {
      try {
        durationPaymentDoc = await consumeDurationPayment({
          userId: req.user._id,
          userModel: resolveUserModel(req.user).userModel,
          durationSec,
          uploaderType,
          paymentId: req.body.durationPaymentId || req.body.paymentId,
          razorpayOrderId: req.body.razorpay_order_id || req.body.razorpayOrderId,
          razorpayPaymentId: req.body.razorpay_payment_id || req.body.razorpayPaymentId,
        });
      } catch (payErr) {
        await deleteVideoFromCloudinary(uploadResult.publicId);
        return res.status(payErr.status || 402).json({
          success: false,
          message: payErr.message || 'Payment required',
          quote,
        });
      }

      durationCharge = durationPaymentDoc.amount;
      durationPaymentStatus = 'paid';
      durationTierSnapshot = durationPaymentDoc.appliedTiernapshot || quote.appliedTier;
    } else {
      durationPaymentStatus = 'free';
      durationCharge = 0;
      durationTierSnapshot = quote.appliedTier || null;
    }

    const thumbnailUrl = getVideoThumbnailUrl(uploadResult.publicId);
    const { creatorType, userModel } = resolveUserModel(req.user);

    // Property connection
    let propertyDoc = null;
    let propertyId = req.body.propertyId || req.body.property || null;
    if (propertyId) {
      propertyDoc = await Property.findById(propertyId);
      if (!propertyDoc) {
        if (durationPaymentDoc) {
          await ReelDurationPayment.findByIdAndUpdate(durationPaymentDoc._id, {
            $set: { paymentStatus: 'paid', usedAt: null },
          });
        }
        await deleteVideoFromCloudinary(uploadResult.publicId);
        return res.status(404).json({ success: false, message: 'Linked property not found' });
      }
      if (creatorType === 'vendor' && req.user._id) {
        const partnerOwnerId = propertyDoc.partnerId ? propertyDoc.partnerId.toString() : null;
        if (partnerOwnerId && partnerOwnerId !== req.user._id.toString()) {
          if (durationPaymentDoc) {
            await ReelDurationPayment.findByIdAndUpdate(durationPaymentDoc._id, {
              $set: { paymentStatus: 'paid', usedAt: null },
            });
          }
          await deleteVideoFromCloudinary(uploadResult.publicId);
          return res.status(403).json({
            success: false,
            message: 'You can only link reels to properties you own',
          });
        }
      }
    }

    let hashtags = [];
    if (req.body.hashtags) {
      if (Array.isArray(req.body.hashtags)) {
        hashtags = req.body.hashtags.map((h) => String(h).trim().toLowerCase()).filter(Boolean);
      } else if (typeof req.body.hashtags === 'string') {
        hashtags = req.body.hashtags
          .split(',')
          .map((h) => h.replace(/^#/, '').trim().toLowerCase())
          .filter(Boolean);
      }
    }

    let city = req.body.city || propertyDoc?.address?.city || req.user.address?.city || null;
    let state = req.body.state || propertyDoc?.address?.state || req.user.address?.state || null;
    let locationObj = { city, state };

    if (req.body.lat && req.body.lng) {
      locationObj.coordinates = {
        type: 'Point',
        coordinates: [Number(req.body.lng), Number(req.body.lat)],
      };
    } else if (propertyDoc?.location?.coordinates?.length === 2) {
      locationObj.coordinates = {
        type: 'Point',
        coordinates: propertyDoc.location.coordinates,
      };
    }

    let category = req.body.category || 'General';
    if (propertyDoc && category === 'General') {
      const pType = (propertyDoc.propertyType || '').toLowerCase();
      if (pType.includes('pg') || pType.includes('hostel')) category = 'PG';
      else if (pType.includes('rent')) category = 'Rent';
      else if (pType.includes('buy')) category = 'Buy';
      else if (pType.includes('plot')) category = 'Plot';
    }

    const reel = await Reel.create({
      user: req.user._id,
      userModel,
      creatorType,
      property: propertyDoc ? propertyDoc._id : null,
      videoUrl: uploadResult.url,
      thumbnailUrl,
      caption,
      hashtags,
      category,
      location: locationObj,
      videoPublicId: uploadResult.publicId,
      status: 'published',
      publishedAt: new Date(),
      durationSec,
      durationCharge,
      durationPaymentStatus,
      durationPayment: durationPaymentDoc ? durationPaymentDoc._id : null,
      durationTierSnapshot,
      durationPricingRole: uploaderType,
    });

    if (durationPaymentDoc) {
      await ReelDurationPayment.findByIdAndUpdate(durationPaymentDoc._id, {
        $set: { reel: reel._id },
      });
    }

    if (typeof req._reelUploadIncrement === 'function') {
      req._reelUploadIncrement();
    }

    const populated = await Reel.findById(reel._id)
      .populate('user', 'name profileImage role')
      .populate(
        'property',
        'propertyName propertyType address coverImage rentDetails pgDetails buyDetails plotDetails'
      );

    res.status(201).json({ success: true, reel: populated });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (uploadedPublicId) {
      try {
        await deleteVideoFromCloudinary(uploadedPublicId);
      } catch (_) {
        /* ignore */
      }
    }
    console.error('Reel upload error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Reel upload failed',
    });
  }
};

/**
 * GET /api/reels/feed?page=1&limit=10&category=&city=&lat=&lng=&exclude=&cursor=
 * Personalized feed: Mongo candidate pools → weighted score → mix/diversity → paginate.
 * `cursor` is accepted as an alias for page (frontend infinite scroll).
 */
export const getFeed = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const pageFromCursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;
    const page = Math.max(
      parseInt(req.query.page, 10) || (Number.isFinite(pageFromCursor) ? pageFromCursor : 1),
      1
    );
    const category = req.query.category || null;
    const city = req.query.city || null;
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;

    let excludeIds = [];
    if (req.query.exclude) {
      excludeIds = String(req.query.exclude)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }

    const result = await buildPersonalizedFeed({
      user: req.user || null,
      page,
      limit,
      category,
      city,
      lat,
      lng,
      excludeIds,
    });

    res.json({
      success: true,
      reels: result.reels,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    console.error('Reel feed error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load feed' });
  }
};

/**
 * POST /api/reels/like/:id
 * Toggle like. Atomic counter updates; unique (user, reel) prevents duplicates.
 */
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id).select('category location status');
    if (!reel || reel.status === 'blocked' || reel.status === 'rejected') {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    const existing = await ReelLike.findOne({ user: req.user._id, reel: id });
    if (existing) {
      await ReelLike.findByIdAndDelete(existing._id);
      const updated = await Reel.findByIdAndUpdate(
        id,
        { $inc: { likesCount: -1 } },
        { new: true }
      );
      const likesCount = Math.max(0, updated?.likesCount ?? 0);
      if (updated && updated.likesCount < 0) {
        await Reel.findByIdAndUpdate(id, { $set: { likesCount: 0 } });
      }

      await updateUserReelPreferences(
        req.user._id,
        reel.category,
        reel.location?.city,
        -REEL_WEIGHTS.LIKE
      );

      return res.json({ success: true, liked: false, likesCount });
    }

    try {
      await ReelLike.create({ user: req.user._id, reel: id });
    } catch (e) {
      if (e?.code === 11000) {
        const current = await Reel.findById(id).select('likesCount');
        return res.json({ success: true, liked: true, likesCount: current?.likesCount || 0 });
      }
      throw e;
    }

    const updated = await Reel.findByIdAndUpdate(id, { $inc: { likesCount: 1 } }, { new: true });

    await updateUserReelPreferences(
      req.user._id,
      reel.category,
      reel.location?.city,
      REEL_WEIGHTS.LIKE
    );

    res.json({ success: true, liked: true, likesCount: updated?.likesCount || 0 });
  } catch (err) {
    console.error('Reel like error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update like' });
  }
};

/**
 * POST /api/reels/save/:id
 * Toggle Save / Bookmark Reel. Atomic counter; unique (user, reel) prevents duplicates.
 */
export const toggleSave = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id).select('category location status');
    if (!reel || reel.status === 'blocked' || reel.status === 'rejected') {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    const existing = await ReelSave.findOne({ user: req.user._id, reel: id });
    if (existing) {
      await ReelSave.findByIdAndDelete(existing._id);
      const updated = await Reel.findByIdAndUpdate(
        id,
        { $inc: { savesCount: -1 } },
        { new: true }
      );
      const savesCount = Math.max(0, updated?.savesCount ?? 0);
      if (updated && updated.savesCount < 0) {
        await Reel.findByIdAndUpdate(id, { $set: { savesCount: 0 } });
      }

      await updateUserReelPreferences(
        req.user._id,
        reel.category,
        reel.location?.city,
        -REEL_WEIGHTS.SAVE
      );

      return res.json({ success: true, saved: false, savesCount });
    }

    try {
      await ReelSave.create({ user: req.user._id, reel: id });
    } catch (e) {
      if (e?.code === 11000) {
        const current = await Reel.findById(id).select('savesCount');
        return res.json({ success: true, saved: true, savesCount: current?.savesCount || 0 });
      }
      throw e;
    }

    const updated = await Reel.findByIdAndUpdate(id, { $inc: { savesCount: 1 } }, { new: true });

    await updateUserReelPreferences(
      req.user._id,
      reel.category,
      reel.location?.city,
      REEL_WEIGHTS.SAVE
    );

    res.json({ success: true, saved: true, savesCount: updated?.savesCount || 0 });
  } catch (err) {
    console.error('Reel save error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update save' });
  }
};

/**
 * GET /api/reels/my
 * Get reels uploaded by the logged-in user
 */
export const getMyReels = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
    const skip = (page - 1) * limit;

    const [reels, total] = await Promise.all([
      Reel.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name profileImage role')
        .populate(
          'property',
          'propertyName propertyType address coverImage rentDetails pgDetails buyDetails plotDetails'
        )
        .lean(),
      Reel.countDocuments({ user: req.user._id }),
    ]);

    const reelIds = reels.map((r) => r._id);
    const [likes, saves] = await Promise.all([
      ReelLike.find({ user: req.user._id, reel: { $in: reelIds } }).select('reel').lean(),
      ReelSave.find({ user: req.user._id, reel: { $in: reelIds } }).select('reel').lean(),
    ]);

    const likedSet = new Set(likes.map((l) => l.reel.toString()));
    const savedSet = new Set(saves.map((s) => s.reel.toString()));

    const items = reels.map((r) => ({
      ...r,
      likedByMe: likedSet.has(r._id.toString()),
      savedByMe: savedSet.has(r._id.toString()),
    }));

    res.json({
      success: true,
      reels: items,
      total,
      page,
      limit,
      hasMore: skip + reels.length < total,
    });
  } catch (err) {
    console.error('Get my reels error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch your reels' });
  }
};

/**
 * GET /api/reels/saved
 * Get saved reels for current user
 */
export const getSavedReels = async (req, res) => {
  try {
    const savedDocs = await ReelSave.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'reel',
        populate: [
          { path: 'user', select: 'name profileImage role' },
          {
            path: 'property',
            select: 'propertyName propertyType address coverImage rentDetails pgDetails buyDetails plotDetails',
          },
        ],
      })
      .lean();

    const reelsRaw = savedDocs.map((s) => s.reel).filter(Boolean);
    const reelIds = reelsRaw.map((r) => r._id);
    const likes = await ReelLike.find({ user: req.user._id, reel: { $in: reelIds } })
      .select('reel')
      .lean();
    const likedSet = new Set(likes.map((l) => l.reel.toString()));

    const reels = reelsRaw.map((r) => ({
      ...r,
      savedByMe: true,
      likedByMe: likedSet.has(r._id.toString()),
    }));

    res.json({ success: true, reels });
  } catch (err) {
    console.error('Get saved reels error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch saved reels' });
  }
};

/**
 * POST /api/reels/:id/track-watch
 * Summarized watch event (send on leave/complete — not every second).
 * Body: watchDuration, videoDuration, completionPercentage, completed
 */
export const trackWatch = async (req, res) => {
  try {
    const { id } = req.params;
    const watchDuration = Math.max(0, Number(req.body.watchDuration) || 0);
    const videoDuration = Math.max(1, Number(req.body.videoDuration) || 10);
    const completionPercentage = Math.min(
      100,
      Math.max(
        0,
        Number(req.body.completionPercentage) ||
          Math.round((watchDuration / videoDuration) * 100)
      )
    );
    const completed = req.body.completed === true || completionPercentage >= 90;

    const reel = await Reel.findById(id).select('category location status');
    if (!reel || reel.status === 'blocked' || reel.status === 'rejected') {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    // Count a view when meaningful watch time is reached
    if (watchDuration >= 2) {
      await Reel.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
    }

    if (req.user) {
      const existing = await ReelInteraction.findOne({ user: req.user._id, reel: id })
        .select('viewCount')
        .lean();
      const previousViewCount = existing?.viewCount || 0;

      await ReelInteraction.findOneAndUpdate(
        { user: req.user._id, reel: id },
        {
          $inc: {
            viewCount: 1,
            totalWatchTime: watchDuration,
            completedViews: completed ? 1 : 0,
          },
          $set: {
            lastWatchPosition: watchDuration,
            lastInteractedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      const weight = resolveWatchPreferenceWeight({
        completionPercentage,
        completed,
        watchDuration,
        previousViewCount,
      });

      await updateUserReelPreferences(req.user._id, reel.category, reel.location?.city, weight);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Track watch error:', err);
    res.status(500).json({ success: false, message: 'Failed to record watch stats' });
  }
};

/**
 * POST /api/reels/:id/property-click
 * Track property click conversion from Reel
 */
export const recordPropertyClick = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findByIdAndUpdate(
      id,
      { $inc: { propertyClicksCount: 1 } },
      { new: true }
    ).populate('property', 'address propertyType');
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    if (req.user) {
      await ReelInteraction.findOneAndUpdate(
        { user: req.user._id, reel: id },
        {
          $inc: { propertyClicks: 1 },
          $set: { lastInteractedAt: new Date() },
        },
        { upsert: true }
      );

      const city = reel.location?.city || reel.property?.address?.city || null;
      let category = reel.category;
      // Strengthen category signal from linked property type when reel is General
      if ((!category || category === 'General') && reel.property?.propertyType) {
        const pType = String(reel.property.propertyType).toLowerCase();
        if (pType.includes('pg') || pType.includes('hostel')) category = 'PG';
        else if (pType.includes('rent')) category = 'Rent';
        else if (pType.includes('buy')) category = 'Buy';
        else if (pType.includes('plot')) category = 'Plot';
      }

      await updateUserReelPreferences(
        req.user._id,
        category,
        city,
        REEL_WEIGHTS.PROPERTY_CLICK
      );
    }

    res.json({ success: true, propertyClicksCount: reel.propertyClicksCount });
  } catch (err) {
    console.error('Property click error:', err);
    res.status(500).json({ success: false, message: 'Failed to record property click' });
  }
};

/**
 * POST /api/reels/:id/not-interested
 * Mark reel as not interested for current user
 */
export const setNotInterested = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    if (req.user) {
      await ReelInteraction.findOneAndUpdate(
        { user: req.user._id, reel: id },
        {
          $set: {
            notInterested: true,
            lastInteractedAt: new Date(),
          },
        },
        { upsert: true }
      );

      await updateUserReelPreferences(
        req.user._id,
        reel.category,
        reel.location?.city,
        REEL_WEIGHTS.NOT_INTERESTED
      );
    }

    res.json({ success: true, message: 'Marked as not interested' });
  } catch (err) {
    console.error('Not interested error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark not interested' });
  }
};

/**
 * POST /api/reels/comment/:id
 * Add comment or nested reply.
 */
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const parentCommentId = req.body.parentComment || null;
    let text = (req.body.text || '').trim().slice(0, MAX_COMMENT_LENGTH);
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const comment = await ReelComment.create({
      user: req.user._id,
      reel: id,
      text,
      parentComment: parentCommentId,
    });

    await Reel.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });

    const populated = await ReelComment.findById(comment._id).populate('user', 'name profileImage');
    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    console.error('Reel comment error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to add comment' });
  }
};

/**
 * GET /api/reels/:id/comments?cursor=&limit=20
 */
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const cursor = req.query.cursor;
    const query = { reel: id, isDeleted: { $ne: true } };
    if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

    const comments = await ReelComment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('user', 'name profileImage')
      .populate('parentComment')
      .lean();

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    res.json({
      success: true,
      comments: items,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (err) {
    console.error('Reel comments list error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load comments' });
  }
};

/**
 * DELETE /api/reels/comment/:commentId
 * Delete comment if author or admin
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await ReelComment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isOwner = comment.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.isDeleted = true;
    await comment.save();

    const updatedReel = await Reel.findByIdAndUpdate(
      comment.reel,
      { $inc: { commentsCount: -1 } },
      { new: true }
    );
    if (updatedReel && updatedReel.commentsCount < 0) {
      await Reel.findByIdAndUpdate(comment.reel, { $set: { commentsCount: 0 } });
    }

    res.json({
      success: true,
      message: 'Comment deleted',
      commentsCount: Math.max(0, updatedReel?.commentsCount ?? 0),
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete comment' });
  }
};

/**
 * POST /api/reels/share/:id
 * Increment sharesCount.
 */
export const shareReel = async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    if (req.user) {
      await ReelInteraction.findOneAndUpdate(
        { user: req.user._id, reel: req.params.id },
        { $inc: { shareCount: 1 }, $set: { lastInteractedAt: new Date() } },
        { upsert: true }
      );
      await updateUserReelPreferences(req.user._id, reel.category, reel.location?.city, REEL_WEIGHTS.SHARE);
    }

    res.json({ success: true, sharesCount: reel.sharesCount });
  } catch (err) {
    console.error('Reel share error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record share' });
  }
};

/**
 * POST /api/reels/:id/view
 */
export const recordView = async (req, res) => {
  try {
    const watchedSeconds = Number(req.body.watchedSeconds) || 0;
    if (watchedSeconds < 2) {
      return res.json({ success: true, viewsCount: null });
    }

    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    res.json({ success: true, viewsCount: reel.viewsCount });
  } catch (err) {
    console.error('Reel view error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record view' });
  }
};

/**
 * GET /api/reels/most-viewed?limit=10
 */
export const getMostViewed = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const reels = await Reel.find({ status: 'published' })
      .sort({ viewsCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('user', 'name profileImage role')
      .populate('property', 'propertyName propertyType address coverImage')
      .lean();
    res.json({ success: true, reels });
  } catch (err) {
    console.error('Reel most-viewed error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load reels' });
  }
};

/**
 * GET /api/reels/:id
 */
export const getReelById = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id)
      .populate('user', 'name profileImage role')
      .populate(
        'property',
        'propertyName propertyType address coverImage rentDetails pgDetails buyDetails plotDetails'
      )
      .lean();
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    let likedByMe = false;
    let savedByMe = false;

    if (req.user) {
      const [like, save] = await Promise.all([
        ReelLike.findOne({ user: req.user._id, reel: reel._id }),
        ReelSave.findOne({ user: req.user._id, reel: reel._id }),
      ]);
      likedByMe = !!like;
      savedByMe = !!save;
    }
    res.json({ success: true, reel: { ...reel, likedByMe, savedByMe } });
  } catch (err) {
    console.error('Reel getById error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load reel' });
  }
};

/**
 * DELETE /api/reels/:id
 */
export const deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const isOwner = reel.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this reel' });
    }

    if (reel.videoPublicId) {
      try {
        await deleteVideoFromCloudinary(reel.videoPublicId);
      } catch (e) {
        console.warn('Cloudinary delete failed:', e.message);
      }
    }

    await ReelLike.deleteMany({ reel: reel._id });
    await ReelSave.deleteMany({ reel: reel._id });
    await ReelComment.deleteMany({ reel: reel._id });
    await ReelInteraction.deleteMany({ reel: reel._id });
    await Reel.findByIdAndDelete(reel._id);

    res.json({ success: true, message: 'Reel deleted' });
  } catch (err) {
    console.error('Reel delete error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete reel' });
  }
};
