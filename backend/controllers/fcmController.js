import jwt from 'jsonwebtoken';
import { getFirebaseAdmin } from '../config/firebase.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Send Test FCM Push Notification
 * @route   POST /api/v1/fcm-tokens/test
 * @route   POST /api/fcm-tokens/test
 * @access  Public / Optional Auth
 */
export const testFcmNotification = async (req, res) => {
  try {
    const {
      platform = 'web',
      channel = 'fcm',
      token,
      tokens,
      userId,
      title = 'HomeZoo Test Notification 🔔',
      body = 'This is a test FCM push notification from HomeZoo.',
      data = {}
    } = req.body || {};

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin not initialized. Please verify Firebase credentials in backend.',
        data: {
          successCount: 0,
          failureCount: 0,
          results: []
        }
      });
    }

    // Collect all tokens to target
    let targetTokens = [];
    let detectedUserIdFromJwt = null;

    // Case 1: Explicit single token provided
    if (token && typeof token === 'string' && token.trim()) {
      const trimmedToken = token.trim();

      // Check if user accidentally passed a JWT authentication token (starts with eyJ)
      if (trimmedToken.startsWith('eyJ')) {
        try {
          const decoded = jwt.decode(trimmedToken);
          if (decoded && (decoded.id || decoded._id)) {
            detectedUserIdFromJwt = decoded.id || decoded._id;
          }
        } catch (e) {
          // ignore decode error
        }
      } else {
        targetTokens.push({
          token: trimmedToken,
          platform: platform || 'web',
          source: 'request_body'
        });
      }
    }

    // Case 2: Explicit array of tokens provided
    if (Array.isArray(tokens) && tokens.length > 0) {
      tokens.forEach(t => {
        if (t && typeof t === 'string' && t.trim() && !t.trim().startsWith('eyJ')) {
          targetTokens.push({
            token: t.trim(),
            platform: platform || 'web',
            source: 'request_body'
          });
        }
      });
    }

    // Case 3: Authenticated user, JWT user, or specific userId provided
    const targetUserId = req.user?._id || userId || detectedUserIdFromJwt;
    if (targetTokens.length === 0 && targetUserId) {
      let doc = await User.findById(targetUserId);
      if (!doc) doc = await Partner.findById(targetUserId);
      if (!doc) doc = await Admin.findById(targetUserId);

      if (doc && doc.fcmTokens) {
        if ((platform === 'web' || platform === 'all') && doc.fcmTokens.web) {
          targetTokens.push({
            token: doc.fcmTokens.web,
            platform: 'web',
            source: `${doc.role || 'user'}_doc`,
            id: doc._id
          });
        }
        if ((platform === 'app' || platform === 'all') && doc.fcmTokens.app) {
          targetTokens.push({
            token: doc.fcmTokens.app,
            platform: 'app',
            source: `${doc.role || 'user'}_doc`,
            id: doc._id
          });
        }
      }
    }

    // Case 4: No specific token/user provided -> lookup registered tokens from database
    if (targetTokens.length === 0) {
      const matchPlatform = platform.toLowerCase();
      const tokenMap = new Map(); // to avoid duplicates

      const addToken = (tok, plat, role, id) => {
        if (tok && typeof tok === 'string' && tok.trim() && tok !== 'null' && !tokenMap.has(tok)) {
          tokenMap.set(tok, {
            token: tok.trim(),
            platform: plat,
            source: `${role}_doc`,
            id
          });
        }
      };

      // Query active Users, Partners, Admins
      const [users, partners, admins] = await Promise.all([
        User.find({
          $or: [
            { 'fcmTokens.web': { $exists: true, $ne: null, $nin: ['', 'null'] } },
            { 'fcmTokens.app': { $exists: true, $ne: null, $nin: ['', 'null'] } }
          ]
        }).select('fcmTokens role _id').limit(20).lean(),
        Partner.find({
          $or: [
            { 'fcmTokens.web': { $exists: true, $ne: null, $nin: ['', 'null'] } },
            { 'fcmTokens.app': { $exists: true, $ne: null, $nin: ['', 'null'] } }
          ]
        }).select('fcmTokens role _id').limit(20).lean(),
        Admin.find({
          $or: [
            { 'fcmTokens.web': { $exists: true, $ne: null, $nin: ['', 'null'] } },
            { 'fcmTokens.app': { $exists: true, $ne: null, $nin: ['', 'null'] } }
          ]
        }).select('fcmTokens role _id').limit(10).lean()
      ]);

      const allDocs = [
        ...users.map(u => ({ ...u, roleName: 'user' })),
        ...partners.map(p => ({ ...p, roleName: 'partner' })),
        ...admins.map(a => ({ ...a, roleName: 'admin' }))
      ];

      for (const d of allDocs) {
        if (matchPlatform === 'web' || matchPlatform === 'all') {
          if (d.fcmTokens?.web) addToken(d.fcmTokens.web, 'web', d.roleName, d._id);
        }
        if (matchPlatform === 'app' || matchPlatform === 'all') {
          if (d.fcmTokens?.app) addToken(d.fcmTokens.app, 'app', d.roleName, d._id);
        }
      }

      targetTokens = Array.from(tokenMap.values());
    }

    // If still no tokens found
    if (targetTokens.length === 0) {
      return res.status(200).json({
        success: false,
        message: `No registered FCM tokens found in database for platform '${platform}'. Pass a 'token' in the JSON body to test a specific device token.`,
        data: {
          platform,
          channel,
          successCount: 0,
          failureCount: 0,
          results: []
        }
      });
    }

    // Format data payload (strings only for FCM)
    const stringifiedData = {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      url: data.url || '/',
      channel: channel || 'fcm',
      platform: platform || 'web',
      type: data.type || 'test_notification',
      timestamp: new Date().toISOString()
    };

    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) {
        stringifiedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    }

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Dispatch notification to each target token
    for (const entry of targetTokens) {
      const message = {
        token: entry.token,
        notification: {
          title: title || 'HomeZoo Test Notification 🔔',
          body: body || 'This is a test notification from HomeZoo.'
        },
        data: stringifiedData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'homezoo_channel',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png'
          },
          fcmOptions: {
            link: data.url || '/'
          }
        }
      };

      try {
        const response = await admin.messaging().send(message);
        successCount++;
        results.push({
          token: entry.token,
          ok: true,
          messageId: response
        });
      } catch (err) {
        failureCount++;
        console.warn(`[FCM Test] Failed to send to token (${entry.platform}):`, err.message);

        const isInvalid =
          err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered';

        // Auto-cleanup stale token from DB if invalid
        if (isInvalid && entry.id) {
          try {
            if (entry.source?.includes('user')) {
              await User.updateOne({ _id: entry.id }, { [`fcmTokens.${entry.platform}`]: null });
            } else if (entry.source?.includes('partner')) {
              await Partner.updateOne({ _id: entry.id }, { [`fcmTokens.${entry.platform}`]: null });
            } else if (entry.source?.includes('admin')) {
              await Admin.updateOne({ _id: entry.id }, { [`fcmTokens.${entry.platform}`]: null });
            }
          } catch (cleanErr) {
            console.error('[FCM Test] Error cleaning invalid token from DB:', cleanErr.message);
          }
        }

        results.push({
          token: entry.token,
          ok: false,
          error: err.message,
          code: err.code || 'UNKNOWN_ERROR'
        });
      }
    }

    // Save notification to DB for record if user/partner exists
    if (req.user?._id) {
      try {
        await Notification.create({
          userId: req.user._id,
          userType: req.user.role === 'partner' ? 'partner' : 'user',
          title: title || 'HomeZoo Test Notification 🔔',
          body: body || 'This is a test notification from HomeZoo.',
          data: stringifiedData,
          type: 'test_notification'
        });
      } catch (dbErr) {
        console.error('[FCM Test] Failed to save test notification to DB:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: successCount > 0,
      message: successCount > 0 ? 'Test notification sent' : 'Failed to send test notification',
      data: {
        platform,
        channel,
        successCount,
        failureCount,
        results
      }
    });
  } catch (error) {
    console.error('FCM Test Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error sending test FCM notification',
      data: {
        successCount: 0,
        failureCount: 1,
        results: [{ ok: false, error: error.message }]
      }
    });
  }
};

/**
 * @desc    Register / Update FCM Token
 * @route   POST /api/v1/fcm-tokens
 * @route   PUT /api/v1/fcm-tokens
 * @route   POST /api/fcm-tokens
 * @access  Public / Optional Auth
 */
export const registerFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform = 'web', userId, userType } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }

    const targetPlatform = platform === 'app' ? 'app' : 'web';
    const targetUserId = req.user?._id || userId;

    if (targetUserId) {
      let updated = false;

      // Update in User collection
      const user = await User.findById(targetUserId);
      if (user) {
        if (!user.fcmTokens) user.fcmTokens = { app: null, web: null };
        user.fcmTokens[targetPlatform] = fcmToken;
        if (typeof user.markModified === 'function') user.markModified('fcmTokens');
        await user.save();
        updated = true;
      }

      // Update in Partner collection
      const partner = await Partner.findById(targetUserId);
      if (partner) {
        if (!partner.fcmTokens) partner.fcmTokens = { app: null, web: null };
        partner.fcmTokens[targetPlatform] = fcmToken;
        if (typeof partner.markModified === 'function') partner.markModified('fcmTokens');
        await partner.save();
        updated = true;
      }

      // Update in Admin collection
      const admin = await Admin.findById(targetUserId);
      if (admin) {
        if (!admin.fcmTokens) admin.fcmTokens = { app: null, web: null };
        admin.fcmTokens[targetPlatform] = fcmToken;
        if (typeof admin.markModified === 'function') admin.markModified('fcmTokens');
        await admin.save();
        updated = true;
      }

      return res.status(200).json({
        success: true,
        message: `FCM token registered successfully for ${targetPlatform} platform`,
        data: {
          platform: targetPlatform,
          userId: targetUserId,
          updated
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `FCM token received for ${targetPlatform} platform`,
      data: {
        platform: targetPlatform,
        tokenReceived: true
      }
    });
  } catch (error) {
    console.error('Register FCM Token Error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering FCM token' });
  }
};

/**
 * @desc    Get FCM Status and Registered Tokens Summary
 * @route   GET /api/v1/fcm-tokens/status
 * @route   GET /api/v1/fcm-tokens
 * @access  Public / Optional Auth
 */
export const getFcmStatus = async (req, res) => {
  try {
    const admin = getFirebaseAdmin();
    const isFirebaseInitialized = !!admin;

    const [userWeb, userApp, partnerWeb, partnerApp, adminWeb, adminApp] = await Promise.all([
      User.countDocuments({ 'fcmTokens.web': { $exists: true, $ne: null, $nin: ['', 'null'] } }),
      User.countDocuments({ 'fcmTokens.app': { $exists: true, $ne: null, $nin: ['', 'null'] } }),
      Partner.countDocuments({ 'fcmTokens.web': { $exists: true, $ne: null, $nin: ['', 'null'] } }),
      Partner.countDocuments({ 'fcmTokens.app': { $exists: true, $ne: null, $nin: ['', 'null'] } }),
      Admin.countDocuments({ 'fcmTokens.web': { $exists: true, $ne: null, $nin: ['', 'null'] } }),
      Admin.countDocuments({ 'fcmTokens.app': { $exists: true, $ne: null, $nin: ['', 'null'] } }),
    ]);

    res.status(200).json({
      success: true,
      service: 'HomeZoo FCM Push Notification Service',
      firebaseInitialized: isFirebaseInitialized,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hoomzo',
      registeredTokens: {
        users: { web: userWeb, app: userApp, total: userWeb + userApp },
        partners: { web: partnerWeb, app: partnerApp, total: partnerWeb + partnerApp },
        admins: { web: adminWeb, app: adminApp, total: adminWeb + adminApp },
        totalActive: userWeb + userApp + partnerWeb + partnerApp + adminWeb + adminApp
      }
    });
  } catch (error) {
    console.error('Get FCM Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching FCM status' });
  }
};
