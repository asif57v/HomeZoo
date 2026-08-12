import User from '../models/User.js';

export const REEL_WEIGHTS = {
  WATCH_SHORT: 1,
  WATCH_COMPLETED: 5,
  LIKE: 8,
  SAVE: 12,
  SHARE: 15,
  PROPERTY_CLICK: 25,
  NOT_INTERESTED: -50,
  SKIP: -10,
};

/**
 * Safely update a user's category and location preference scores
 */
export async function updateUserReelPreferences(userId, category, city, weight) {
  if (!userId || !weight) return;
  try {
    const user = await User.findById(userId);
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

    // Update category score
    const cat = category || 'General';
    const currentScore = user.reelPreferences.categories[cat] || 0;
    user.reelPreferences.categories[cat] = Math.max(-100, Math.min(1000, currentScore + weight));

    // Update location score if city is provided
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

/**
 * Calculate recommendation ranking score for a single Reel document
 */
export function calculateReelScore(reel, userPreferences = null, userCity = null) {
  let score = 0;

  // 1. Featured Boost
  if (reel.isFeatured) score += 50;

  // 2. Engagement Rate Score
  const engagement =
    (reel.likesCount || 0) * 3 +
    (reel.savesCount || 0) * 5 +
    (reel.sharesCount || 0) * 7 +
    (reel.propertyClicksCount || 0) * 10;
  const views = Math.max(1, reel.viewsCount || 0);
  score += Math.min(40, (engagement / views) * 20);

  // 3. User Category Preference Match
  if (userPreferences && userPreferences.categories) {
    const catScore = userPreferences.categories[reel.category] || 0;
    score += catScore * 1.5;
  }

  // 4. Location Match
  const reelCity = reel.location?.city || reel.property?.address?.city;
  if (userCity && reelCity && userCity.toLowerCase() === reelCity.toLowerCase()) {
    score += 25;
  } else if (userPreferences && userPreferences.locations && reelCity) {
    const matchedLoc = userPreferences.locations.find(
      (l) => l.city && l.city.toLowerCase() === reelCity.toLowerCase()
    );
    if (matchedLoc) {
      score += Math.min(20, (matchedLoc.score || 0) * 0.5);
    }
  }

  // 5. Freshness Decay (decay over 30 days)
  const ageInHours = (Date.now() - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, 30 - ageInHours / 24);
  score += freshness;

  return score;
}
