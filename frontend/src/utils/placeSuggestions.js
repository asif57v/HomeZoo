// Shared place autocomplete for the home search and the search page.
// Live results are restricted to India and to real places (cities / localities), because the
// public Photon service searches the whole world and would otherwise return e.g. "Noiron-sous-Gevrey, France".

// Lower rank = shown first
const PLACE_RANK = {
  city: 0,
  town: 0,
  suburb: 1,
  neighbourhood: 1,
  quarter: 1,
  locality: 1,
  borough: 1,
  district: 2,
};

const DEFAULT_CENTER = { lat: 22.97, lng: 78.65 }; // centre of India

const getBiasPoint = () => {
  try {
    const coords = JSON.parse(localStorage.getItem('user_coords') || 'null');
    if (coords?.lat && coords?.lng) return { lat: coords.lat, lng: coords.lng };
  } catch {
    // ignore malformed saved coordinates
  }
  return DEFAULT_CENTER;
};

const formatPlace = (props) => {
  const area = props.city || props.district;
  const parts = [props.name];
  if (area && area.toLowerCase() !== props.name.toLowerCase()) parts.push(area);
  if (props.state && !parts.some((x) => x.toLowerCase() === props.state.toLowerCase())) {
    parts.push(props.state);
  }
  return parts.join(', ');
};

/**
 * Live India-only place suggestions for `query`. Always resolves (empty array on failure).
 */
export const fetchIndianPlaces = async (query, limit = 6) => {
  const { lat, lng } = getBiasPoint();

  try {
    // Ask for many hits: most of the world's matches are filtered out below
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=25&lang=en&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    const places = (data?.features || [])
      .map((f) => f.properties || {})
      .filter(
        (p) => p.countrycode === 'IN' && p.name && p.osm_key === 'place' && p.osm_value in PLACE_RANK
      )
      .sort((a, b) => PLACE_RANK[a.osm_value] - PLACE_RANK[b.osm_value])
      .map(formatPlace);
    const unique = Array.from(new Set(places)).slice(0, limit);
    if (unique.length > 0) return unique;
  } catch (err) {
    console.warn('Photon autocomplete failed', err);
  }

  // Fallback: Google Geocoding, India only
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&components=country:in`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results) {
        return data.results.slice(0, limit).map((item) => item.formatted_address);
      }
    } catch (err) {
      console.warn('Geocoding suggestions error', err);
    }
  }
  return [];
};

const startsWithWord = (text, query) =>
  text.toLowerCase().split(/[\s,]+/).some((word) => word.startsWith(query));

/**
 * Orders suggestions so the most relevant come first:
 * 1. places that START with the typed text, from our own listings then the curated list
 *    ("no" -> Noida),
 * 2. live India results,
 * 3. places that merely CONTAIN the typed text.
 */
export const rankLocations = (rawQuery, { listings = [], curated = [], live = [] }, max = 8) => {
  const query = (rawQuery || '').toLowerCase().trim();
  if (!query) return curated.slice(0, max);

  const ours = [...listings, ...curated];
  const prefix = ours.filter((loc) => startsWithWord(loc, query));
  const contains = ours.filter((loc) => !startsWithWord(loc, query) && loc.toLowerCase().includes(query));

  return Array.from(new Set([...prefix, ...live, ...contains])).slice(0, max);
};
