// India-only place suggestions (ported from web utils/placeSuggestions.js; Google JS Places widget replaced by REST fallbacks)
import { GOOGLE_MAP_API_KEY } from '../config';

const withTimeout = async (url, ms = 8000, opts) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...(opts || {}), signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};

const fromNominatim = (r) => {
  const a = r.address || {};
  const parts = [
    a.suburb || a.neighbourhood || a.road || r.name,
    a.city || a.town || a.village || a.state_district,
    a.state,
  ].filter(Boolean);
  return Array.from(new Set(parts)).join(', ');
};

const fetchPhotonPlaces = async (query, limit) => {
  try {
    const res = await withTimeout(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=30&lang=en&lat=22.7196&lon=75.8577`);
    const data = await res.json();
    return (data.features || [])
      .filter((f) => (f.properties?.countrycode || '').toUpperCase() === 'IN')
      .map((f) => {
        const p = f.properties || {};
        return [p.name, p.city || p.district, p.state].filter(Boolean).join(', ');
      })
      .filter(Boolean)
      .slice(0, limit);
  } catch { return []; }
};

const fetchNominatimPlaces = async (query, limit) => {
  try {
    const res = await withTimeout(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=${limit}&q=${encodeURIComponent(query)}`, 8000, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return (data || []).map(fromNominatim).filter(Boolean);
  } catch { return []; }
};

const fetchGeocodePlaces = async (query, limit) => {
  if (!GOOGLE_MAP_API_KEY) return [];
  try {
    const res = await withTimeout(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAP_API_KEY}&components=country:in`);
    const data = await res.json();
    return (data.results || []).map((r) => r.formatted_address.replace(/,\s*India$/i, '')).slice(0, limit);
  } catch { return []; }
};

export const fetchIndianPlaces = async (query, limit = 8) => {
  const [photon, nominatim] = await Promise.all([fetchPhotonPlaces(query, limit), fetchNominatimPlaces(query, limit)]);
  const all = [...photon, ...nominatim];
  if (all.length === 0) all.push(...(await fetchGeocodePlaces(query, limit)));
  const seen = new Set();
  return all.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit + 4);
};

export const searchPlaceResults = async (query, limit = 6) => {
  const places = await fetchIndianPlaces(query, limit);
  return places.map((description) => ({ description, placeId: null }));
};

export const withoutCountryOnly = (results = []) => results.filter((r) => r && r.description && r.description.toLowerCase() !== 'india');

const startsWithWord = (text, query) => text.toLowerCase().split(/[\s,]+/).some((word) => word.startsWith(query));

export const rankLocations = (rawQuery, { listings = [], curated = [], live = [] }, max = 12) => {
  const query = (rawQuery || '').toLowerCase().trim();
  if (!query) return curated.slice(0, max);
  const ours = [...listings, ...curated];
  const prefix = ours.filter((loc) => startsWithWord(loc, query));
  const contains = ours.filter((loc) => !startsWithWord(loc, query) && loc.toLowerCase().includes(query));
  return Array.from(new Set([...prefix, ...live, ...contains])).slice(0, max);
};

export const parseSuggestionAddress = (text = '') => {
  const parts = String(text).split(',').map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== 'india');
  const n = parts.length;
  return {
    country: 'India',
    state: n >= 2 ? parts[n - 1] : '',
    city: n >= 3 ? parts[n - 2] : (n === 2 ? parts[0] : ''),
    area: n >= 3 ? parts[0] : '',
    fullAddress: parts.join(', '),
    pincode: '',
  };
};

export const MASTER_LOCATIONS = [
  'Rajwada, Indore', 'Rajendra Nagar, Indore', 'Rajeev Gandhi Circle, Indore', 'Vijay Nagar, Indore', 'Palasia, Indore',
  'New Palasia, Indore', 'Old Palasia, Indore', 'Bhawarkua, Indore', 'Khandwa Road, Indore', 'LIG Colony, Indore', 'Rau, Indore',
  'Sanwer Road, Indore', 'Super Corridor, Indore', 'Talawali Chanda, Indore', 'Bhawrasla, Indore', 'Manglia, Indore',
  'AB Road, Indore', 'Annapurna, Indore', 'Saket, Indore', 'Scheme 54, Indore', 'Scheme 78, Indore', 'Scheme 140, Indore',
  'Scheme 71, Indore', 'Nipania, Indore', 'Mahalakshmi Nagar, Indore', 'Bengali Square, Indore', 'Airport Road, Indore',
  'Mhow, Indore', 'Sudama Nagar, Indore', 'Khajrana, Indore', 'Kanadia Road, Indore', 'Patnipura, Indore', 'Tower Square, Indore',
  'Navlakha, Indore', 'Pardesipura, Indore', 'Clerk Colony, Indore',
  'Bhopal, Madhya Pradesh', 'Indore, Madhya Pradesh', 'Gwalior, Madhya Pradesh', 'Jabalpur, Madhya Pradesh', 'Ujjain, Madhya Pradesh',
  'Dewas, Madhya Pradesh', 'Khandwa, Madhya Pradesh', 'Khargone, Madhya Pradesh', 'Ratlam, Madhya Pradesh', 'Rewa, Madhya Pradesh',
  'Satna, Madhya Pradesh', 'Sagar, Madhya Pradesh', 'Singrauli, Madhya Pradesh', 'Burhanpur, Madhya Pradesh', 'Vidisha, Madhya Pradesh',
  'Chhindwara, Madhya Pradesh', 'Rajgarh, Madhya Pradesh', 'Hoshangabad, Madhya Pradesh', 'Itarsi, Madhya Pradesh', 'Sehore, Madhya Pradesh',
  'Neemuch, Madhya Pradesh', 'Mandsaur, Madhya Pradesh',
  'Delhi, NCR', 'New Delhi', 'Gurugram, Haryana', 'Noida, Uttar Pradesh', 'Mumbai, Maharashtra', 'Pune, Maharashtra',
  'Bengaluru, Karnataka', 'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan', 'Chandigarh', 'Lucknow, Uttar Pradesh', 'Surat, Gujarat', 'Nagpur, Maharashtra', 'Vadodara, Gujarat',
  'Kota, Rajasthan', 'Udaipur, Rajasthan', 'Agra, Uttar Pradesh', 'Varanasi, Uttar Pradesh', 'Kanpur, Uttar Pradesh',
  'Patna, Bihar', 'Ranchi, Jharkhand', 'Raipur, Chhattisgarh',
];
