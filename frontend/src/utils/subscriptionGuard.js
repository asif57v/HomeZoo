import toast from 'react-hot-toast';
import subscriptionService from '../services/subscriptionService';
import useFeatureFlagsStore from '../store/featureFlagsStore';

/**
 * Evaluates whether a partner is currently eligible to add a new property.
 *
 * Rules:
 * 1. If subscriptions are disabled globally by admin -> ALLOWED.
 * 2. If partner has a paid plan:
 *    - If plan is active and not expired:
 *        - If propertiesAdded < maxProperties -> ALLOWED.
 *        - Else -> BLOCKED (property_limit_reached).
 *    - If plan is expired or inactive -> BLOCKED (subscription_expired).
 * 3. If partner does NOT have a paid plan:
 *    - If free trial is granted and propertiesLimit > 0:
 *        - If propertiesUsed < propertiesLimit -> ALLOWED.
 *        - Else -> BLOCKED (free_limit_ended).
 *    - Else -> BLOCKED (no_subscription).
 */
export const evaluateSubscriptionCanAddProperty = (data = {}) => {
  const { subscription, freeTrial } = data;
  const subscriptionEnabled = useFeatureFlagsStore.getState().subscriptionEnabled;

  if (subscriptionEnabled === false) {
    return {
      canAdd: true,
      reason: 'subscription_disabled',
      message: 'Subscriptions are currently disabled'
    };
  }

  // If backend provided canAddProperty directly
  if (typeof data.canAddProperty === 'boolean') {
    return {
      canAdd: data.canAddProperty,
      reason: data.subscriptionStatus || (data.canAddProperty ? 'active' : 'blocked'),
      message: data.reasonMessage || (data.canAddProperty ? 'Allowed' : 'Your subscription has ended. Please choose a subscription plan.')
    };
  }

  const isSubActive =
    subscription?.status === 'active' &&
    subscription?.expiryDate &&
    new Date(subscription.expiryDate) > new Date();

  if (subscription?.planId) {
    if (!isSubActive) {
      return {
        canAdd: false,
        reason: 'subscription_expired',
        message: 'Your subscription has ended. Please choose a subscription plan to add properties.'
      };
    }

    const maxAllowed = subscription.planId?.maxProperties;
    const propertiesAdded = subscription.propertiesAdded || 0;
    if (typeof maxAllowed === 'number' && maxAllowed > 0 && propertiesAdded >= maxAllowed) {
      return {
        canAdd: false,
        reason: 'property_limit_reached',
        message: `Property limit reached! Your plan allows ${maxAllowed} ${maxAllowed === 1 ? 'property' : 'properties'}. Please upgrade your subscription.`
      };
    }

    return {
      canAdd: true,
      reason: 'active_subscription',
      message: 'Active subscription'
    };
  }

  // No paid subscription - check free plan allowance
  if (freeTrial && Number(freeTrial.propertiesLimit) > 0) {
    const limit = Number(freeTrial.propertiesLimit) || 0;
    const used = Number(freeTrial.propertiesUsed) || 0;
    if (used >= limit) {
      return {
        canAdd: false,
        reason: 'free_limit_ended',
        message: 'Your free property limit has ended. Please choose a subscription plan to add properties.'
      };
    }
    // Free properties still remaining: allow upload for free!
    return {
      canAdd: true,
      reason: 'free_trial',
      message: 'Free trial active'
    };
  }

  return {
    canAdd: false,
    reason: 'no_subscription',
    message: 'Your subscription has ended. Please choose a subscription plan to add properties.'
  };
};

/**
 * Fetches the current partner subscription status and evaluates if they can add property.
 */
export const checkPartnerCanAddProperty = async () => {
  try {
    const data = await subscriptionService.getCurrentSubscription();
    return evaluateSubscriptionCanAddProperty(data);
  } catch (error) {
    console.error('Failed to verify partner subscription status:', error);
    // On network failure, don't silently block
    return {
      canAdd: true,
      reason: 'check_failed',
      message: 'Could not verify subscription'
    };
  }
};

/**
 * Helper to navigate to Add Property or redirect directly to Subscription page with in-app notification.
 */
export const handleNavigateToAddProperty = async (navigate, options = {}) => {
  const { targetRoute = '/hotel/join', state = {} } = options;

  const result = await checkPartnerCanAddProperty();

  if (!result.canAdd) {
    // Show in-app notification immediately
    toast.error(result.message, {
      id: 'sub-guard-toast',
      duration: 4000,
      icon: '🔒'
    });

    // Direct redirect to subscription page
    navigate('/hotel/subscriptions', {
      state: {
        reason: result.reason,
        alertMessage: result.message
      }
    });
    return false;
  }

  navigate(targetRoute, { state });
  return true;
};
