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

export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', opts);
};
