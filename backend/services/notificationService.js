import { getFirebaseAdmin } from '../config/firebase.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

class NotificationService {
  /**
   * Helper function to get all FCM tokens from a user with their platform
   * @param {Object} user - User document
   * @returns {Array<{token: string, platform: string}>} - Array of token objects
   */
  getUserFcmTokens(user) {
    const tokens = [];

    if (user.fcmTokens) {
      if (user.fcmTokens.app) {
        tokens.push({ token: user.fcmTokens.app, platform: 'app' });
      }
      if (user.fcmTokens.web) {
        tokens.push({ token: user.fcmTokens.web, platform: 'web' });
      }
    }

    return tokens;
  }

  /**
   * Send notification to a single FCM token
   * @param {string} fcmToken - FCM token of the device
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notification
   */
  async sendToToken(fcmToken, notification, data = {}) {
    try {
      const admin = getFirebaseAdmin();

      if (!admin) {
        throw new Error('Firebase Admin not initialized');
      }

      // Convert all data values to strings (FCM requirement)
      const stringifiedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }

      const defaultUrl = data.url || '/';

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'HomeZoo',
          body: notification.body || '',
        },
        data: {
          ...stringifiedData,
          url: defaultUrl,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'homezoo_channel',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
          fcmOptions: {
            link: defaultUrl,
          },
        },
      };

      const response = await admin.messaging().send(message);

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      console.error('Error sending notification to token:', error);

      // Handle invalid or unregistered token
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return {
          success: false,
          isInvalidToken: true,
          error: 'Invalid or unregistered token',
          code: error.code,
        };
      }

      throw error;
    }
  }

  /**
   * Send notification to a user, partner, or admin by ID
   * @param {string} userId - User, Partner, or Admin ID
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @param {string} userType - 'user', 'partner', 'admin' (default: 'user')
   * @returns {Promise<Object>} - Result of sending notification
   */
  async sendToUser(userId, notification, data = {}, userType = 'user') {
    try {
      console.log(`[NotificationService] Sending to User: ${userId} (${userType})`);
      let user;

      if (userType === 'admin') {
        const Admin = (await import('../models/Admin.js')).default;
        user = await Admin.findById(userId);
      } else if (userType === 'partner') {
        const Partner = (await import('../models/Partner.js')).default;
        user = await Partner.findById(userId);
        // Fallback to User model if partner has no tokens or not found
        if (!user || (!user.fcmTokens?.app && !user.fcmTokens?.web)) {
          const userFallback = await User.findById(userId);
          if (userFallback && (userFallback.fcmTokens?.app || userFallback.fcmTokens?.web)) {
            user = userFallback;
          }
        }
      } else {
        user = await User.findById(userId);
        // Fallback to Partner model if user has no tokens or not found
        if (!user || (!user.fcmTokens?.app && !user.fcmTokens?.web)) {
          const Partner = (await import('../models/Partner.js')).default;
          const partnerFallback = await Partner.findById(userId);
          if (partnerFallback && (partnerFallback.fcmTokens?.app || partnerFallback.fcmTokens?.web)) {
            user = partnerFallback;
          }
        }
      }

      if (!user) {
        console.warn(`[NotificationService] ${userType} not found: ${userId}`);
        return {
          success: false,
          error: `${userType} not found`,
        };
      }

      let savedNotification;
      try {
        savedNotification = await Notification.create({
          userId: user._id,
          userType: userType,
          title: notification.title || 'HomeZoo',
          body: notification.body || '',
          data: data || {},
          type: data.type || 'general',
        });
      } catch (dbError) {
        console.error('[NotificationService] Failed to save notification to database:', dbError);
      }

      // Get platform-based FCM tokens (app and web)
      const tokenEntries = this.getUserFcmTokens(user);
      console.log(`[NotificationService] Found ${tokenEntries.length} FCM token(s) for ${userType} (${tokenEntries.map(t => t.platform).join(', ')}).`);

      if (tokenEntries.length === 0) {
        return {
          success: false,
          error: 'User does not have any registered FCM tokens',
          notificationId: savedNotification?._id,
        };
      }

      let lastResult = null;
      let successCount = 0;
      let hasTokenCleaned = false;

      for (const entry of tokenEntries) {
        try {
          console.log(`[NotificationService] Dispatching to ${entry.platform} token: ${entry.token.substring(0, 10)}...`);
          const result = await this.sendToToken(entry.token, notification, data);
          if (result.success) {
            successCount++;
            lastResult = result;
          } else if (result.isInvalidToken) {
            // Clean up invalid token for this platform from DB
            console.warn(`[NotificationService] Stale token detected on platform: ${entry.platform}. Removing from DB.`);
            if (user.fcmTokens) {
              user.fcmTokens[entry.platform] = null;
              hasTokenCleaned = true;
            }
          }
        } catch (err) {
          console.error(`[NotificationService] Exception sending to ${entry.platform} token:`, err);
        }
      }

      // Save user if stale tokens were cleaned
      if (hasTokenCleaned) {
        if (typeof user.markModified === 'function') {
          user.markModified('fcmTokens');
        }
        await user.save().catch(e => console.error('[NotificationService] Error saving cleaned token state:', e));
      }

      // Update notification with FCM Message ID if sent
      if (successCount > 0 && savedNotification && lastResult?.messageId) {
        savedNotification.fcmMessageId = lastResult.messageId;
        await savedNotification.save().catch(e => console.error('Failed to update FCM ID:', e));
      }

      return {
        success: successCount > 0,
        successCount,
        notificationId: savedNotification?._id,
      };
    } catch (error) {
      console.error('[NotificationService] Error sending notification to user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper to send notification to all active Admins
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   */
  async sendToAdmins(notification, data = {}) {
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const admins = await Admin.find({ isActive: true });
      if (!admins || admins.length === 0) return [];

      const promises = admins.map(admin =>
        this.sendToUser(admin._id, notification, data, 'admin').catch(err => {
          console.error(`Failed to notify admin ${admin._id}:`, err);
        })
      );
      return await Promise.all(promises);
    } catch (err) {
      console.error('[NotificationService] Error in sendToAdmins:', err);
      return [];
    }
  }
}

export default new NotificationService();
