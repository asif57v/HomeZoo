// Shared formatting helpers (ported from web components)
export const formatCompactPrice = (n) => {
  if (n >= 1e7) return `${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${+(n / 1e5).toFixed(2)} Lac`;
  return Number(n).toLocaleString('en-IN');
};

export const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/[`'"]/g, '').trim();
};

export const inr = (amount, fraction = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(Number(amount) || 0);

// Services throw `error.response?.data || error.message`; normalise to a readable string
export const errMsg = (err, fallback = 'Something went wrong') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return err.message || err.error || err?.response?.data?.message || fallback;
};

// PG/Hostel sharing comes from the owner's rooms (RoomType.roomCategory). pgDetails.occupancy was always
// saved as 'Single' by the post wizard, so it is only a fallback when a property has no rooms.
const SHARING_ORDER = ['private', 'double', 'triple', 'shared'];
const SHARING_SHORT = { private: 'Single', double: 'Double', triple: 'Triple', shared: 'Dorm' };
export const roomSharingLabel = (roomTypes, occupancy) => {
  const cats = [...new Set((Array.isArray(roomTypes) ? roomTypes : [])
    .filter((r) => r && r.isActive !== false)
    .map((r) => String(r.roomCategory || '').toLowerCase())
    .filter((c) => SHARING_SHORT[c]))]
    .sort((a, b) => SHARING_ORDER.indexOf(a) - SHARING_ORDER.indexOf(b));
  if (cats.length === 1) return cats[0] === 'shared' ? 'Shared dorm' : `${SHARING_SHORT[cats[0]]} sharing`;
  if (cats.length > 1) return `${cats.map((c) => SHARING_SHORT[c]).join(' / ')} sharing`;
  if (Array.isArray(roomTypes) && roomTypes.length) return null; // rooms exist but none has a sharing category
  return occupancy && occupancy !== 'Other' ? `${occupancy} sharing` : null;
};

// The Property schema defaults avgRating to 3, so a property with no reviews must read "New", not 3.0
export const realRating = (item) => {
  const reviews = Number(item?.totalReviews || 0);
  const r = Number(item?.avgRating ?? item?.rating);
  if (reviews > 0 && r > 0) return r.toFixed(1);
  // "New" only while the API says the listing is inside the admin-set window (Admin → Settings → Show "New" tag for)
  return item?.isNewListing === true ? 'New' : null;
};

export const formatDate =(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', opts);
};
