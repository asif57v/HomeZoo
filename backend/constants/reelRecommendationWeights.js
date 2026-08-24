/**
 * Central weights/config for HomeZoo Reel recommendations.
 * Tune here without touching scoring/service logic.
 */

export const REEL_SIGNAL_WEIGHTS = {
  /** Preference score deltas applied to user.reelPreferences */
  IMMEDIATE_SKIP: -12,
  WATCH_SHORT: 1, // watched but < 50%
  WATCH_50: 6,
  WATCH_80: 10,
  WATCH_COMPLETED: 14,
  REPEAT_WATCH: 8,
  LIKE: 12,
  SAVE: 20,
  SHARE: 14,
  PROPERTY_CLICK: 25,
  NOT_INTERESTED: -50,
};

/** Backward-compatible aliases used by existing controller imports */
export const REEL_WEIGHTS = {
  SKIP: REEL_SIGNAL_WEIGHTS.IMMEDIATE_SKIP,
  WATCH_SHORT: REEL_SIGNAL_WEIGHTS.WATCH_SHORT,
  WATCH_COMPLETED: REEL_SIGNAL_WEIGHTS.WATCH_COMPLETED,
  LIKE: REEL_SIGNAL_WEIGHTS.LIKE,
  SAVE: REEL_SIGNAL_WEIGHTS.SAVE,
  SHARE: REEL_SIGNAL_WEIGHTS.SHARE,
  PROPERTY_CLICK: REEL_SIGNAL_WEIGHTS.PROPERTY_CLICK,
  NOT_INTERESTED: REEL_SIGNAL_WEIGHTS.NOT_INTERESTED,
  WATCH_50: REEL_SIGNAL_WEIGHTS.WATCH_50,
  WATCH_80: REEL_SIGNAL_WEIGHTS.WATCH_80,
  REPEAT_WATCH: REEL_SIGNAL_WEIGHTS.REPEAT_WATCH,
};

/** Score contribution multipliers when ranking eligible reels */
export const REEL_SCORE_WEIGHTS = {
  FEATURED: 40,
  CATEGORY_PREF_MULT: 1.8,
  LOCATION_CITY_MATCH: 35,
  LOCATION_PREF_CITY_MULT: 0.6,
  LOCATION_PREF_CITY_CAP: 30,
  DISTANCE_0_5_KM: 50,
  DISTANCE_5_15_KM: 35,
  DISTANCE_15_30_KM: 20,
  DISTANCE_30_100_KM: 8,
  DISTANCE_100_PLUS_KM: 2,
  ENGAGEMENT_LIKES: 3,
  ENGAGEMENT_COMMENTS: 2,
  ENGAGEMENT_SHARES: 6,
  ENGAGEMENT_SAVES: 8,
  ENGAGEMENT_PROPERTY_CLICKS: 12,
  ENGAGEMENT_VIEWS: 0.15,
  ENGAGEMENT_RATE_CAP: 45,
  ENGAGEMENT_RATE_SCALE: 22,
  FRESHNESS_MAX_DAYS: 30,
  FRESHNESS_MAX_SCORE: 30,
  CREATOR_AFFINITY_CAP: 12,
  CREATOR_AFFINITY_MULT: 0.4,
  NEW_VENDOR_BOOST: 8,
  EXPLORATION_BASE: 5,
  PROPERTY_LINKED_BOOST: 6,
};

/** Feed composition */
export const REEL_FEED_MIX = {
  PERSONALIZED: 0.7,
  RELATED: 0.2,
  DISCOVERY: 0.1,
};

/** Cold-start mix for users with little/no Reel history */
export const REEL_NEW_USER_MIX = {
  LOCATION: 0.4,
  TRENDING: 0.3,
  RECENT: 0.2,
  EXPLORATION: 0.1,
};

/** Candidate pool + ranking limits (avoid full-collection scans) */
export const REEL_CANDIDATE_CONFIG = {
  /** Max reels pulled from Mongo before in-memory ranking */
  MAX_CANDIDATES: 180,
  POOL_LOCATION: 70,
  POOL_TRENDING: 50,
  POOL_RECENT: 40,
  POOL_CATEGORY: 50,
  POOL_EXPLORATION: 30,
  /** Interaction count below this → cold-start / new-user path */
  NEW_USER_INTERACTION_THRESHOLD: 5,
  /** Preference score sum below this → treat as new user */
  NEW_USER_PREF_SCORE_THRESHOLD: 15,
  /** Trending window in days */
  TRENDING_WINDOW_DAYS: 14,
  /** Max consecutive reels from same creator in feed */
  MAX_CONSECUTIVE_SAME_CREATOR: 1,
  /** Soft cap on same category streak */
  MAX_CONSECUTIVE_SAME_CATEGORY: 2,
  /** Soft cap on same property repeats in a ranked window */
  MAX_SAME_PROPERTY_IN_WINDOW: 1,
  /** Prefer not re-showing heavily seen reels within N days */
  SEEN_COOLDOWN_DAYS: 3,
  NEW_VENDOR_MAX_REELS: 5,
  NEW_VENDOR_MAX_AGE_DAYS: 21,
};

export const REEL_CATEGORIES = ['PG', 'Rent', 'Buy', 'Plot', 'General'];
