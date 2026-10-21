import PlatformSettings from '../models/PlatformSettings.js';

export const SUBSCRIPTION_DISABLED_MESSAGE = 'Subscriptions are currently unavailable.';
export const RAZORPAY_DISABLED_MESSAGE = 'Online payments are temporarily unavailable. Please try again later.';

/**
 * Single source of truth for the admin "Platform Feature Controls".
 * Missing fields (older documents) default to enabled so nothing breaks before an admin changes them.
 */
export const getFeatureFlags = async () => {
  const settings = await PlatformSettings.getSettings();
  const fc = settings.featureControls || {};
  return {
    subscriptionEnabled: fc.subscriptionEnabled !== false,
    razorpayEnabled: fc.razorpayEnabled !== false,
    subscriptionUpdatedAt: fc.subscriptionUpdatedAt || null,
    razorpayUpdatedAt: fc.razorpayUpdatedAt || null
  };
};

const guard = (flag, status, code, message) => async (req, res, next) => {
  try {
    const flags = await getFeatureFlags();
    if (flags[flag]) return next();
    return res.status(status).json({ success: false, message, code });
  } catch (error) {
    // Never let a settings read failure silently open or crash a paid flow
    console.error('Feature guard error:', error.message);
    return res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' });
  }
};

/** Blocks NEW subscription purchases / plan listing. Does not touch existing subscription data. */
export const requireSubscriptionEnabled = guard('subscriptionEnabled', 403, 'SUBSCRIPTION_DISABLED', SUBSCRIPTION_DISABLED_MESSAGE);

/** Blocks creation of NEW Razorpay orders only. Verify / webhook / refund routes must NOT use this. */
export const requireRazorpayEnabled = guard('razorpayEnabled', 503, 'RAZORPAY_DISABLED', RAZORPAY_DISABLED_MESSAGE);
