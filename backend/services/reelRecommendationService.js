/**
 * Isolated Reel recommendation service (weighted, non-ML).
 * Upgrade path: swap scoring internals without changing controller/API contracts.
 */

import mongoose from 'mongoose';
import Reel from '../models/Reel.js';
import ReelLike from '../models/ReelLike.js';
import ReelSave from '../models/ReelSave.js';
import ReelInteraction from '../models/ReelInteraction.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Admin from '../models/Admin.js';
import {
  REEL_SCORE_WEIGHTS as W,
  REEL_FEED_MIX,
  REEL_NEW_USER_MIX,
  REEL_CANDIDATE_CONFIG as CFG,
  REEL_CATEGORIES,
  REEL_SIGNAL_WEIGHTS,
  REEL_WEIGHTS,
} from '../constants/reelRecommendationWeights.js';

export { REEL_WEIGHTS, REEL_SIGNAL_WEIGHTS };

const POPULATE_USER = { path: 'user', select: 'name profileImage role' };
const POPULATE_PROPERTY = {
  path: 'property',
  select:
    'propertyName propertyType address coverImage location rentDetails pgDetails buyDetails plotDetails partnerId',
};

function toIdString(id) {
  if (!id) return null;
  if (typeof id === 'string') return id;
  if (id._id) return id._id.toString();
  return id.toString();
}

function normalizeCity(city) {
  if (!city || typeof city !== 'string') return null;
  const c = city.trim();
  return c || null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getReelCoords(reel) {
  const rc = reel?.location?.coordinates?.coordinates;
  if (Array.isArray(rc) && rc.length === 2 && Number.isFinite(rc[0]) && Number.isFinite(rc[1])) {
    return { lng: rc[0], lat: rc[1] };
  }
  const pc = reel?.property?.location?.coordinates;
  if (Array.isArray(pc) && pc.length === 2 && Number.isFinite(pc[0]) && Number.isFinite(pc[1])) {
    return { lng: pc[0], lat: pc[1] };
  }
  return null;
}

function getReelCity(reel) {
  return (
    normalizeCity(reel?.location?.city) ||
    normalizeCity(reel?.property?.address?.city) ||
    null
  );
}

function getCreatorId(reel) {
  return toIdString(reel?.user);
}

function getPropertyId(reel) {
  return toIdString(reel?.property);
}

function daysSince(date) {
  if (!date) return 999;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function uniqueById(reels) {
  const seen = new Set();
  const out = [];
  for (const r of reels) {
    const id = toIdString(r._id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

/**
 * Resolve preference weight for a watch completion event.
 */
export function resolveWatchPreferenceWeight({
  completionPercentage = 0,
  completed = false,
  watchDuration = 0,
  previousViewCount = 0,
}) {
  if (previousViewCount >= 1 && (completed || completionPercentage >= 50)) {
    return REEL_SIGNAL_WEIGHTS.REPEAT_WATCH;
  }
  if (completed || completionPercentage >= 90) return REEL_SIGNAL_WEIGHTS.WATCH_COMPLETED;
  if (completionPercentage >= 80) return REEL_SIGNAL_WEIGHTS.WATCH_80;
  if (completionPercentage >= 50) return REEL_SIGNAL_WEIGHTS.WATCH_50;
  if (watchDuration < 2 || completionPercentage < 20) return REEL_SIGNAL_WEIGHTS.IMMEDIATE_SKIP;
  return REEL_SIGNAL_WEIGHTS.WATCH_SHORT;
}

/**
 * Atomically bump category/location preference scores on User.
 */
export async function updateUserReelPreferences(userId, category, city, weight) {
  if (!userId || !weight) return;
  try {
    const cat = REEL_CATEGORIES.includes(category) ? category : 'General';
    const path = `reelPreferences.categories.${cat}`;

    await User.findByIdAndUpdate(userId, {
      $inc: { [path]: weight },
    });

    // Clamp category score into [-100, 1000]
    const user = await User.findById(userId).select('reelPreferences');
    if (!user) return;

    if (!user.reelPreferences) {
      user.reelPreferences = {
        categories: { PG: 0, Rent: 0, Buy: 0, Plot: 0, General: 0 },
        locations: [],
      };
    }
    if (!user.reelPreferences.categories) {
      user.reelPreferences.categories = { PG: 0, Rent: 0, Buy: 0, Plot: 0, General: 0 };
    }

    const current = user.reelPreferences.categories[cat] || 0;
    user.reelPreferences.categories[cat] = Math.max(-100, Math.min(1000, current));

    if (city && typeof city === 'string' && city.trim()) {
      const normalizedCity = city.trim().toLowerCase();
      if (!user.reelPreferences.locations) user.reelPreferences.locations = [];
      const locIdx = user.reelPreferences.locations.findIndex(
        (l) => l.city && l.city.toLowerCase() === normalizedCity
      );
      if (locIdx >= 0) {
        user.reelPreferences.locations[locIdx].score = Math.max(
          -100,
          Math.min(1000, (user.reelPreferences.locations[locIdx].score || 0) + weight)
        );
      } else {
        user.reelPreferences.locations.push({
          city: city.trim(),
          score: Math.max(0, weight),
        });
      }
    }

    await user.save();
  } catch (err) {
    console.error('Error updating user reel preferences:', err.message);
  }
}

function getCategoryScores(prefs) {
  const cats = prefs?.categories || {};
  return REEL_CATEGORIES.reduce((acc, c) => {
    acc[c] = Number(cats[c]) || 0;
    return acc;
  }, {});
}

function sumPositivePrefs(prefs) {
  const cats = getCategoryScores(prefs);
  return Object.values(cats).reduce((s, v) => s + Math.max(0, v), 0);
}

function topPreferredCategories(prefs, n = 2) {
  return Object.entries(getCategoryScores(prefs))
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .slice(0, n)
    .map(([cat]) => cat);
}

function preferredCities(prefs, userCity) {
  const cities = new Set();
  const uc = normalizeCity(userCity);
  if (uc) cities.add(uc);
  (prefs?.locations || [])
    .filter((l) => (l.score || 0) > 0 && l.city)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
    .forEach((l) => cities.add(l.city.trim()));
  return [...cities];
}

export function isNewReelUser(user, interactionCount = 0) {
  if (!user) return true;
  if (interactionCount < CFG.NEW_USER_INTERACTION_THRESHOLD) return true;
  return sumPositivePrefs(user.reelPreferences) < CFG.NEW_USER_PREF_SCORE_THRESHOLD;
}

function basePublishedQuery(extra = {}) {
  return { status: { $nin: ['blocked', 'rejected'] }, ...extra };
}

async function fetchPool(query, sort, limit, excludeObjectIds) {
  const q = { ...query };
  if (excludeObjectIds.length) {
    q._id = { ...(q._id || {}), $nin: excludeObjectIds };
  }
  return Reel.find(q)
    .sort(sort)
    .limit(limit)
    .populate(POPULATE_USER)
    .populate(POPULATE_PROPERTY)
    .lean();
}

/**
 * Build a bounded candidate set via Mongo filters/indexes (not full collection).
 */
async function fetchCandidates({
  categoryFilter,
  cities,
  userCoords,
  excludeObjectIds,
  preferredCats,
  isColdStart,
}) {
  const pools = [];
  const trendingSince = new Date(Date.now() - CFG.TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const categoryClause = categoryFilter && categoryFilter !== 'All' ? { category: categoryFilter } : {};

  // Location / city pool
  if (cities.length) {
    const cityRegexes = cities.map((c) => new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    pools.push(
      fetchPool(
        basePublishedQuery({
          ...categoryClause,
          $or: [
            { 'location.city': { $in: cityRegexes } },
          ],
        }),
        { createdAt: -1 },
        CFG.POOL_LOCATION,
        excludeObjectIds
      )
    );
  }

  // GeoNear-ish: if we have coords, pull recent published and filter by distance later;
  // also query properties near user via Reel location 2dsphere when present.
  if (userCoords?.lat != null && userCoords?.lng != null) {
    pools.push(
      Reel.find({
        ...basePublishedQuery(categoryClause),
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [userCoords.lng, userCoords.lat],
            },
            $maxDistance: 100000, // 100 km
          },
        },
        ...(excludeObjectIds.length ? { _id: { $nin: excludeObjectIds } } : {}),
      })
        .limit(CFG.POOL_LOCATION)
        .populate(POPULATE_USER)
        .populate(POPULATE_PROPERTY)
        .lean()
        .catch(() => []) // sparse index / missing coords should not fail feed
    );
  }

  // Preferred categories
  if (preferredCats.length) {
    pools.push(
      fetchPool(
        basePublishedQuery({ category: { $in: preferredCats } }),
        { createdAt: -1 },
        CFG.POOL_CATEGORY,
        excludeObjectIds
      )
    );
  }

  // Trending / high engagement (recent window)
  pools.push(
    fetchPool(
      basePublishedQuery({
        ...categoryClause,
        createdAt: { $gte: trendingSince },
      }),
      { propertyClicksCount: -1, savesCount: -1, likesCount: -1, viewsCount: -1 },
      CFG.POOL_TRENDING,
      excludeObjectIds
    )
  );

  // Recent
  pools.push(
    fetchPool(
      basePublishedQuery(categoryClause),
      { createdAt: -1 },
      CFG.POOL_RECENT,
      excludeObjectIds
    )
  );

  // Exploration: underrepresented / other categories + newer low-engagement vendors
  const exploreCats = REEL_CATEGORIES.filter((c) => !preferredCats.includes(c));
  pools.push(
    fetchPool(
      basePublishedQuery({
        category: { $in: exploreCats.length ? exploreCats : REEL_CATEGORIES },
      }),
      { createdAt: -1 },
      CFG.POOL_EXPLORATION,
      excludeObjectIds
    )
  );

  const results = await Promise.all(pools);
  let candidates = uniqueById(results.flat().filter(Boolean));

  // Soft fallback if filters were too strict
  if (candidates.length < Math.min(20, CFG.MAX_CANDIDATES / 4)) {
    const fallback = await fetchPool(
      basePublishedQuery(categoryClause),
      { createdAt: -1 },
      CFG.MAX_CANDIDATES,
      excludeObjectIds
    );
    candidates = uniqueById([...candidates, ...fallback]);
  }

  if (candidates.length > CFG.MAX_CANDIDATES) {
    candidates = candidates.slice(0, CFG.MAX_CANDIDATES);
  }

  return { candidates, isColdStart };
}

function locationScore(reel, userCity, userCoords, prefs) {
  let score = 0;
  const reelCity = getReelCity(reel);
  const coords = getReelCoords(reel);

  if (userCoords?.lat != null && userCoords?.lng != null && coords) {
    const km = haversineKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng);
    if (km <= 5) score += W.DISTANCE_0_5_KM;
    else if (km <= 15) score += W.DISTANCE_5_15_KM;
    else if (km <= 30) score += W.DISTANCE_15_30_KM;
    else if (km <= 100) score += W.DISTANCE_30_100_KM;
    else score += W.DISTANCE_100_PLUS_KM;
  } else if (
    userCity &&
    reelCity &&
    userCity.toLowerCase() === reelCity.toLowerCase()
  ) {
    score += W.LOCATION_CITY_MATCH;
  }

  if (prefs?.locations?.length && reelCity) {
    const matched = prefs.locations.find(
      (l) => l.city && l.city.toLowerCase() === reelCity.toLowerCase()
    );
    if (matched) {
      score += Math.min(W.LOCATION_PREF_CITY_CAP, (matched.score || 0) * W.LOCATION_PREF_CITY_MULT);
    }
  }

  return score;
}

function engagementScore(reel) {
  const raw =
    (reel.likesCount || 0) * W.ENGAGEMENT_LIKES +
    (reel.commentsCount || 0) * W.ENGAGEMENT_COMMENTS +
    (reel.sharesCount || 0) * W.ENGAGEMENT_SHARES +
    (reel.savesCount || 0) * W.ENGAGEMENT_SAVES +
    (reel.propertyClicksCount || 0) * W.ENGAGEMENT_PROPERTY_CLICKS +
    (reel.viewsCount || 0) * W.ENGAGEMENT_VIEWS;

  const views = Math.max(1, reel.viewsCount || 0);
  const rate = Math.min(W.ENGAGEMENT_RATE_CAP, (raw / views) * W.ENGAGEMENT_RATE_SCALE);
  // Blend absolute + rate so brand-new viral items and steady performers both score
  return rate + Math.min(25, Math.log10(raw + 1) * 8);
}

function freshnessScore(reel) {
  const ageDays = daysSince(reel.publishedAt || reel.createdAt);
  return Math.max(0, W.FRESHNESS_MAX_SCORE * (1 - ageDays / W.FRESHNESS_MAX_DAYS));
}

function categoryScore(reel, prefs) {
  const cats = getCategoryScores(prefs);
  return (cats[reel.category] || 0) * W.CATEGORY_PREF_MULT;
}

function creatorAffinityScore(reel, creatorAffinity) {
  const id = getCreatorId(reel);
  if (!id || !creatorAffinity[id]) return 0;
  return Math.min(W.CREATOR_AFFINITY_CAP, creatorAffinity[id] * W.CREATOR_AFFINITY_MULT);
}

function isNewVendorReel(reel, creatorReelCounts) {
  const id = getCreatorId(reel);
  if (!id) return false;
  const count = creatorReelCounts[id] || 0;
  const age = daysSince(reel.createdAt);
  return count <= CFG.NEW_VENDOR_MAX_REELS && age <= CFG.NEW_VENDOR_MAX_AGE_DAYS;
}

/**
 * Weighted score for a single reel given user context.
 */
export function calculateReelScore(reel, context = {}) {
  const {
    userPreferences = null,
    userCity = null,
    userCoords = null,
    creatorAffinity = {},
    creatorReelCounts = {},
    explorationBoost = false,
    recentlySeen = null,
  } = context;

  let score = 0;

  if (reel.isFeatured) score += W.FEATURED;
  if (reel.property) score += W.PROPERTY_LINKED_BOOST;

  score += categoryScore(reel, userPreferences);
  score += locationScore(reel, userCity, userCoords, userPreferences);
  score += engagementScore(reel);
  score += freshnessScore(reel);
  score += creatorAffinityScore(reel, creatorAffinity);

  if (isNewVendorReel(reel, creatorReelCounts)) {
    score += W.NEW_VENDOR_BOOST;
  }

  if (explorationBoost) {
    score += W.EXPLORATION_BASE;
  }

  // Mild penalty for strongly disliked categories
  const catPref = getCategoryScores(userPreferences)[reel.category] || 0;
  if (catPref < 0) score += catPref * W.CATEGORY_PREF_MULT;

  // Soft penalty for recently seen reels so un-watched reels rank higher
  if (recentlySeen && recentlySeen.has(toIdString(reel._id))) {
    score -= 50;
  }

  return score;
}

/**
 * Apply 70/20/10 mix + creator/property/category diversity.
 */
function diversifyAndMix(scoredReels, targetCount, opts = {}) {
  const { coldStart = false } = opts;
  if (!scoredReels.length) return [];

  const sorted = [...scoredReels].sort((a, b) => b.recScore - a.recScore);

  const personalizedCount = Math.max(1, Math.round(targetCount * REEL_FEED_MIX.PERSONALIZED));
  const relatedCount = Math.max(0, Math.round(targetCount * REEL_FEED_MIX.RELATED));
  const discoveryCount = Math.max(0, targetCount - personalizedCount - relatedCount);

  const personalized = sorted.slice(0, personalizedCount);
  const rest = sorted.slice(personalizedCount);

  // Related: mid-tier score band / same top categories
  const related = rest.slice(0, relatedCount);

  // Discovery: lower scores + new vendors, shuffled lightly
  const discoveryPool = rest.slice(relatedCount);
  const newVendorFirst = [
    ...discoveryPool.filter((r) => r._isNewVendor),
    ...discoveryPool.filter((r) => !r._isNewVendor),
  ];
  shuffleInPlace(newVendorFirst);
  const discovery = newVendorFirst.slice(0, Math.max(discoveryCount, Math.ceil(targetCount * 0.1)));

  let mixed;
  if (coldStart) {
    const locN = Math.round(targetCount * REEL_NEW_USER_MIX.LOCATION);
    const trendN = Math.round(targetCount * REEL_NEW_USER_MIX.TRENDING);
    const recentN = Math.round(targetCount * REEL_NEW_USER_MIX.RECENT);
    const exploreN = Math.max(0, targetCount - locN - trendN - recentN);

    const byLoc = sorted.filter((r) => r._locationRelevant);
    const byTrend = [...sorted].sort((a, b) => (b._engagementRaw || 0) - (a._engagementRaw || 0));
    const byRecent = [...sorted].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const byExplore = shuffleInPlace([...sorted]);

    mixed = uniqueById([
      ...byLoc.slice(0, locN),
      ...byTrend.slice(0, trendN),
      ...byRecent.slice(0, recentN),
      ...byExplore.slice(0, exploreN),
    ]);
  } else {
    // Interleave for natural feed feel: P P R P D P ...
    mixed = [];
    const queues = {
      p: [...personalized],
      r: [...related],
      d: [...discovery],
    };
    const pattern = ['p', 'p', 'r', 'p', 'd', 'p', 'p', 'r', 'p', 'd'];
    let pi = 0;
    while (mixed.length < targetCount * 3 && (queues.p.length || queues.r.length || queues.d.length)) {
      const key = pattern[pi % pattern.length];
      pi += 1;
      const next = queues[key].shift();
      if (next) mixed.push(next);
      else {
        const fallback = queues.p.shift() || queues.r.shift() || queues.d.shift();
        if (fallback) mixed.push(fallback);
      }
    }
    mixed = uniqueById(mixed);
  }

  // Creator / property / category diversity pass
  const final = [];
  const usedIds = new Set();
  let lastCreator = null;
  let lastCategory = null;
  let creatorStreak = 0;
  let categoryStreak = 0;
  const propertyCounts = new Map();

  const tryPush = (reel) => {
    const id = toIdString(reel._id);
    if (!id || usedIds.has(id)) return false;

    const creator = getCreatorId(reel);
    const propertyId = getPropertyId(reel);
    const category = reel.category || 'General';

    if (
      creator &&
      creator === lastCreator &&
      creatorStreak >= CFG.MAX_CONSECUTIVE_SAME_CREATOR
    ) {
      return false;
    }
    if (
      category === lastCategory &&
      categoryStreak >= CFG.MAX_CONSECUTIVE_SAME_CATEGORY
    ) {
      return false;
    }
    if (propertyId && (propertyCounts.get(propertyId) || 0) >= CFG.MAX_SAME_PROPERTY_IN_WINDOW) {
      return false;
    }

    usedIds.add(id);
    final.push(reel);
    if (creator === lastCreator) creatorStreak += 1;
    else {
      lastCreator = creator;
      creatorStreak = 1;
    }
    if (category === lastCategory) categoryStreak += 1;
    else {
      lastCategory = category;
      categoryStreak = 1;
    }
    if (propertyId) propertyCounts.set(propertyId, (propertyCounts.get(propertyId) || 0) + 1);
    return true;
  };

  for (const reel of mixed) {
    if (final.length >= targetCount) break;
    tryPush(reel);
  }

  // Fill gaps with remaining scored items if diversity skipped too many
  if (final.length < targetCount) {
    for (const reel of sorted) {
      if (final.length >= targetCount) break;
      const id = toIdString(reel._id);
      if (!id || usedIds.has(id)) continue;
      usedIds.add(id);
      final.push(reel);
    }
  }

  return final.slice(0, targetCount);
}

async function buildUserContext(user, requestedCity, lat, lng) {
  const prefs = user?.reelPreferences || null;
  const userCity =
    normalizeCity(requestedCity) ||
    normalizeCity(user?.address?.city) ||
    null;

  let userCoords = null;
  if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    userCoords = { lat: Number(lat), lng: Number(lng) };
  } else if (
    user?.address?.coordinates?.lat != null &&
    user?.address?.coordinates?.lng != null
  ) {
    userCoords = {
      lat: Number(user.address.coordinates.lat),
      lng: Number(user.address.coordinates.lng),
    };
  }

  let excludedIds = [];
  let creatorAffinity = {};
  let interactionCount = 0;
  let recentlySeen = new Set();

  if (user?._id && user.constructor?.modelName !== 'Admin') {
    // Only User model has reel interactions in this schema
    const interactions = await ReelInteraction.find({ user: user._id })
      .select('reel notInterested viewCount propertyClicks completedViews lastInteractedAt')
      .lean();

    interactionCount = interactions.length;
    const cooldownMs = CFG.SEEN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    for (const i of interactions) {
      const rid = toIdString(i.reel);
      if (!rid) continue;
      if (i.notInterested) excludedIds.push(rid);
      if (
        i.lastInteractedAt &&
        Date.now() - new Date(i.lastInteractedAt).getTime() < cooldownMs &&
        (i.viewCount || 0) > 0
      ) {
        recentlySeen.add(rid);
      }
    }

    // Creator affinity from likes/saves/property clicks
    const [likes, saves] = await Promise.all([
      ReelLike.find({ user: user._id }).select('reel').lean(),
      ReelSave.find({ user: user._id }).select('reel').lean(),
    ]);
    const signalReelIds = [
      ...likes.map((l) => l.reel),
      ...saves.map((s) => s.reel),
      ...interactions.filter((i) => (i.propertyClicks || 0) > 0 || (i.completedViews || 0) > 0).map((i) => i.reel),
    ];
    if (signalReelIds.length) {
      const signalReels = await Reel.find({ _id: { $in: signalReelIds } })
        .select('user')
        .lean();
      for (const r of signalReels) {
        const cid = toIdString(r.user);
        if (cid) creatorAffinity[cid] = (creatorAffinity[cid] || 0) + 1;
      }
    }
  }

  return {
    prefs,
    userCity,
    userCoords,
    excludedIds,
    recentlySeen,
    creatorAffinity,
    interactionCount,
    cities: preferredCities(prefs, userCity),
    preferredCats: topPreferredCategories(prefs, 3),
  };
}

/**
 * Main entry: personalized paginated Reel feed.
 */
export async function buildPersonalizedFeed({
  user = null,
  page = 1,
  limit = 10,
  category = null,
  city = null,
  lat = null,
  lng = null,
  excludeIds = [],
} = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);

  const ctx = await buildUserContext(user, city, lat, lng);
  const coldStart = isNewReelUser(user, ctx.interactionCount);

  // Explicit notInterested and excludeIds from frontend pagination
  const excludeSet = new Set([
    ...ctx.excludedIds,
    ...excludeIds.map(toIdString).filter(Boolean),
  ]);

  const excludeObjectIds = [...excludeSet]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const { candidates } = await fetchCandidates({
    categoryFilter: category,
    cities: ctx.cities,
    userCoords: ctx.userCoords,
    excludeObjectIds,
    preferredCats: coldStart ? [] : ctx.preferredCats,
    isColdStart: coldStart,
  });

  if (!candidates.length) {
    return {
      reels: [],
      page: safePage,
      limit: safeLimit,
      hasMore: false,
      nextCursor: null,
      meta: { coldStart, candidateCount: 0 },
    };
  }

  // Creator reel counts for new-vendor boost (from candidate set only)
  const creatorReelCounts = {};
  for (const r of candidates) {
    const cid = getCreatorId(r);
    if (cid) creatorReelCounts[cid] = (creatorReelCounts[cid] || 0) + 1;
  }

  const scoreContext = {
    userPreferences: ctx.prefs,
    userCity: ctx.userCity,
    userCoords: ctx.userCoords,
    creatorAffinity: ctx.creatorAffinity,
    creatorReelCounts,
    recentlySeen: ctx.recentlySeen,
  };

  const scored = candidates.map((reel) => {
    const locScore = locationScore(reel, ctx.userCity, ctx.userCoords, ctx.prefs);
    const eng = engagementScore(reel);
    const recScore = calculateReelScore(reel, scoreContext);
    return {
      ...reel,
      recScore,
      _locationRelevant: locScore >= W.LOCATION_CITY_MATCH * 0.5 || locScore >= W.DISTANCE_15_30_KM,
      _engagementRaw: eng,
      _isNewVendor: isNewVendorReel(reel, creatorReelCounts),
    };
  });

  // Rank a larger window then paginate. When excludeIds are provided (infinite scroll),
  // take the next top slice after exclusions to avoid cross-page duplicates.
  const windowSize = Math.min(
    scored.length,
    Math.max(safeLimit * 10, safeLimit * (safePage + 2))
  );
  const ranked = diversifyAndMix(scored, windowSize, { coldStart });

  let pageItems;
  let hasMore;
  if (excludeIds.length > 0) {
    pageItems = ranked.slice(0, safeLimit);
    hasMore = ranked.length > safeLimit;
  } else {
    const start = (safePage - 1) * safeLimit;
    pageItems = ranked.slice(start, start + safeLimit);
    hasMore = start + safeLimit < ranked.length;
  }

  // Attach like/save state
  let likedSet = new Set();
  let savedSet = new Set();
  if (user?._id && pageItems.length) {
    const ids = pageItems.map((r) => r._id);
    const [likes, saves] = await Promise.all([
      ReelLike.find({ user: user._id, reel: { $in: ids } }).select('reel').lean(),
      ReelSave.find({ user: user._id, reel: { $in: ids } }).select('reel').lean(),
    ]);
    likes.forEach((l) => likedSet.add(toIdString(l.reel)));
    saves.forEach((s) => savedSet.add(toIdString(s.reel)));
  }

  const reels = pageItems.map((r) => {
    const {
      recScore,
      _locationRelevant,
      _engagementRaw,
      _isNewVendor,
      ...rest
    } = r;
    return {
      ...rest,
      likedByMe: likedSet.has(toIdString(r._id)),
      savedByMe: savedSet.has(toIdString(r._id)),
    };
  });

  return {
    reels,
    page: safePage,
    limit: safeLimit,
    hasMore,
    nextCursor: hasMore ? String(safePage + 1) : null,
    meta: { coldStart, candidateCount: candidates.length },
  };
}
