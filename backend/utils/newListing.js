import PlatformSettings from '../models/PlatformSettings.js';

// "New" tag window from Admin → Settings → Show "New" tag for (PlatformSettings.newTagDuration).
// Counted from first approval (approvedAt); listings approved before that field existed use createdAt.
// Same rule as the $addFields in getPublicProperties, for APIs that return plain documents.
export const newTagCutoff = (settings) => {
  const nt = settings?.newTagDuration || {};
  const value = Number(nt.value ?? 7);
  if (!(value > 0)) return null; // 0 = tag switched off
  const ms = value * (nt.unit === 'hours' ? 3600000 : 86400000);
  return new Date(Date.now() - ms);
};

export const isNewListing = (property, cutoff) => {
  if (!cutoff || !property) return false;
  const since = property.approvedAt || property.createdAt;
  return !!since && new Date(since) > cutoff;
};

/** Adds isNewListing to each plain property object (call .toObject()/.lean() first). */
export const withNewFlag = async (items, settings) => {
  const cutoff = newTagCutoff(settings || (await PlatformSettings.getSettings()));
  const list = Array.isArray(items) ? items : [items];
  list.forEach((p) => { if (p && typeof p === 'object') p.isNewListing = isNewListing(p, cutoff); });
  return items;
};
