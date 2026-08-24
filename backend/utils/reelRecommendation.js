/**
 * Thin re-export + preference helpers for Reel recommendations.
 * Scoring/feed assembly lives in services/reelRecommendationService.js
 * Weights live in constants/reelRecommendationWeights.js
 */

export {
  REEL_WEIGHTS,
  REEL_SIGNAL_WEIGHTS,
  updateUserReelPreferences,
  calculateReelScore,
  resolveWatchPreferenceWeight,
  buildPersonalizedFeed,
  isNewReelUser,
} from '../services/reelRecommendationService.js';

export {
  REEL_SCORE_WEIGHTS,
  REEL_FEED_MIX,
  REEL_NEW_USER_MIX,
  REEL_CANDIDATE_CONFIG,
  REEL_CATEGORIES,
} from '../constants/reelRecommendationWeights.js';
