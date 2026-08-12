import Reel from '../models/Reel.js';
import ReelLike from '../models/ReelLike.js';
import ReelSave from '../models/ReelSave.js';
import ReelComment from '../models/ReelComment.js';
import ReelInteraction from '../models/ReelInteraction.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import {
  uploadVideoToCloudinary,
  getVideoThumbnailUrl,
  deleteVideoFromCloudinary,
} from '../utils/cloudinary.js';
import {
  REEL_WEIGHTS,
  updateUserReelPreferences,
  calculateReelScore,
} from '../utils/reelRecommendation.js';
import fs from 'fs';

const MAX_REEL_DURATION_SEC = 10;
const MAX_CAPTION_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;

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
 * POST /api/reels/upload
 * Upload a reel (video only, max 10s, max 20MB). Optional property link & location.
 */
export const uploadReel = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }
    filePath = req.file.path;
    const rawCaption = req.body.caption != null ? String(req.body.caption) : '';
    const caption = sanitizeCaption(rawCaption);

    const uploadResult = await uploadVideoToCloudinary(filePath, 'reels');
    const duration = uploadResult.duration;

    if (duration != null && duration > MAX_REEL_DURATION_SEC) {
      await deleteVideoFromCloudinary(uploadResult.publicId);
      return res.status(400).json({
        success: false,
        message: `Video must be 10 seconds or less. Your video is ${Math.ceil(duration)}s.`,
      });
    }

    const thumbnailUrl = getVideoThumbnailUrl(uploadResult.publicId);

    // Creator type determination
    const vendorRoles = ['partner', 'broker', 'agent', 'seller'];
    const creatorType = vendorRoles.includes(req.user.role) ? 'vendor' : 'user';

    // Property connection
    let propertyDoc = null;
    let propertyId = req.body.propertyId || req.body.property || null;
    if (propertyId) {
      propertyDoc = await Property.findById(propertyId);
      if (!propertyDoc) {
        return res.status(404).json({ success: false, message: 'Linked property not found' });
      }
      // If creator is partner/vendor, ensure property belongs to them
      if (creatorType === 'vendor' && req.user._id) {
        const partnerOwnerId = propertyDoc.partnerId ? propertyDoc.partnerId.toString() : null;
        if (partnerOwnerId && partnerOwnerId !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only link reels to properties you own',
          });
        }
      }
    }

    // Hashtags processing
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

    // Location processing (infer from property if not explicitly passed)
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

    // Default category fallback from property if available
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
    });

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
    console.error('Reel upload error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Reel upload failed',
    });
  }
};

/**
 * GET /api/reels/feed?cursor=&limit=10&category=&city=
 * Personalized Feed with Weighted Recommendation Engine & 70/20/10 Mix Ratio
 */
export const getFeed = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const category = req.query.category;
    const requestedCity = req.query.city || req.user?.address?.city || null;

    let query = { status: 'published' };
    if (category && category !== 'All') query.category = category;

    // Fetch candidate reels
    let candidateReels = await Reel.find(query)
      .populate('user', 'name profileImage role')
      .populate(
        'property',
        'propertyName propertyType address coverImage rentDetails pgDetails buyDetails plotDetails'
      )
      .lean();

    if (candidateReels.length === 0) {
      return res.json({ success: true, reels: [], nextCursor: null, hasMore: false });
    }

    // Exclude Not-Interested reels if user logged in
    let likedSet = new Set();
    let savedSet = new Set();

    if (req.user) {
      const notInterestedInteractions = await ReelInteraction.find({
        user: req.user._id,
        notInterested: true,
      }).select('reel');
      const excludedIds = new Set(notInterestedInteractions.map((i) => i.reel.toString()));

      candidateReels = candidateReels.filter((r) => !excludedIds.has(r._id.toString()));

      // Fetch user's likes & saves for items in feed
      const reelIds = candidateReels.map((r) => r._id);
      const [likes, saves] = await Promise.all([
        ReelLike.find({ user: req.user._id, reel: { $in: reelIds } }).select('reel'),
        ReelSave.find({ user: req.user._id, reel: { $in: reelIds } }).select('reel'),
      ]);

      likes.forEach((l) => likedSet.add(l.reel.toString()));
      saves.forEach((s) => savedSet.add(s.reel.toString()));
    }

    // Score all candidate reels
    const userPrefs = req.user?.reelPreferences || null;
    const scoredReels = candidateReels.map((reel) => {
      const recScore = calculateReelScore(reel, userPrefs, requestedCity);
      return { ...reel, recScore };
    });

    // Sort by recommendation score descending
    scoredReels.sort((a, b) => b.recScore - a.recScore);

    // Apply 70% Personalized / 20% Related / 10% Discovery Mix
    const count70 = Math.ceil(limit * 0.7);
    const count20 = Math.ceil(limit * 0.2);

    const personalized = scoredReels.slice(0, count70);
    const remaining = scoredReels.slice(count70);

    // 20% Related / Trending
    const related = remaining.slice(0, count20);
    // 10% Discovery / New
    const discovery = remaining.slice(count20);
    // Shuffle discovery items slightly for freshness
    discovery.sort(() => 0.5 - Math.random());

    const mixed = [...personalized, ...related, ...discovery].slice(0, limit);

    // Format feed item properties
    const feed = mixed.map((r) => ({
      ...r,
      likedByMe: likedSet.has(r._id.toString()),
      savedByMe: savedSet.has(r._id.toString()),
    }));

    res.json({
      success: true,
      reels: feed,
      nextCursor: null,
      hasMore: false,
    });
  } catch (err) {
    console.error('Reel feed error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load feed' });
  }
};

/**
 * POST /api/reels/like/:id
 * Toggle like.
 */
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const existing = await ReelLike.findOne({ user: req.user._id, reel: id });
    if (existing) {
      await ReelLike.findByIdAndDelete(existing._id);
      reel.likesCount = Math.max(0, (reel.likesCount || 0) - 1);
      await reel.save();

      // Negative preference weight
      await updateUserReelPreferences(req.user._id, reel.category, reel.location?.city, -REEL_WEIGHTS.LIKE);

      return res.json({ success: true, liked: false, likesCount: reel.likesCount });
    }

    await ReelLike.create({ user: req.user._id, reel: id });
    reel.likesCount = (reel.likesCount || 0) + 1;
    await reel.save();

    // Positive preference weight
    await updateUserReelPreferences(req.user._id, reel.category, reel.location?.city, REEL_WEIGHTS.LIKE);

    res.json({ success: true, liked: true, likesCount: reel.likesCount });
  } catch (err) {
    console.error('Reel like error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update like' });
  }
};

/**
 * POST /api/reels/save/:id
 * Toggle Save / Bookmark Reel
 */
export const toggleSave = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const existing = await ReelSave.findOne({ user: req.user._id, reel: id });
    if (existing) {
      await ReelSave.findByIdAndDelete(existing._id);
      reel.savesCount = Math.max(0, (reel.savesCount || 0) - 1);
      await reel.save();

      await updateUserReelPreferences(req.user._id, reel.category, reel.location?.city, -REEL_WEIGHTS.SAVE);

      return res.json({ success: true, saved: false, savesCount: reel.savesCount });
    }

    await ReelSave.create({ user: req.user._id, reel: id });
    reel.savesCount = (reel.savesCount || 0) + 1;
    await reel.save();

    await updateUserReelPreferences(req.user._id, reel.category, reel.location?.city, REEL_WEIGHTS.SAVE);

    res.json({ success: true, saved: true, savesCount: reel.savesCount });
  } catch (err) {
    console.error('Reel save error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update save' });
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
          { path: 'property', select: 'propertyName propertyType address coverImage' },
        ],
      })
      .lean();

    const reels = savedDocs.map((s) => s.reel).filter(Boolean).map((r) => ({
      ...r,
      savedByMe: true,
    }));

    res.json({ success: true, reels });
  } catch (err) {
    console.error('Get saved reels error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch saved reels' });
  }
};

/**
 * POST /api/reels/:id/track-watch
 * Track user watch behavior: watchDuration, videoDuration, completionPercentage, completed, source
 */
export const trackWatch = async (req, res) => {
  try {
    const { id } = req.params;
    const watchDuration = Math.max(0, Number(req.body.watchDuration) || 0);
    const videoDuration = Math.max(1, Number(req.body.videoDuration) || 10);
    const completionPercentage = Math.min(100, Math.max(0, Number(req.body.completionPercentage) || Math.round((watchDuration / videoDuration) * 100)));
    const completed = req.body.completed === true || completionPercentage >= 90;

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    // Atomically increment viewsCount on Reel if watch duration >= 2s
    if (watchDuration >= 2) {
      await Reel.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
    }

    if (req.user) {
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

      // Update User Preferences Score based on completion
      const weight = completed
        ? REEL_WEIGHTS.WATCH_COMPLETED
        : watchDuration >= 2
        ? REEL_WEIGHTS.WATCH_SHORT
        : REEL_WEIGHTS.SKIP;

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
    );
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

      // High weight score boost for property click
      await updateUserReelPreferences(
        req.user._id,
        reel.category,
        reel.location?.city,
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

    reel.commentsCount = (reel.commentsCount || 0) + 1;
    await reel.save();

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
