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

let mapsLoader = null;

// Loads the Google Maps JS API (places library) once; resolves null when unavailable.
const loadGoogleMaps = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
  if (!apiKey) return Promise.resolve(null);
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.onload = async () => {
      try {
        await Promise.all([
          window.google.maps.importLibrary('places'),
          window.google.maps.importLibrary('geocoding'),
        ]);
        resolve(window.google.maps);
      } catch {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  }).then((maps) => {
    if (!maps) mapsLoader = null; // allow a retry later
    return maps;
  });
  return mapsLoader;
};

// Google Places Autocomplete restricted to India. Resolves [] on any failure.
const fetchGooglePlaces = async (query, limit) => {
  try {
    const maps = await loadGoogleMaps();
    if (!maps?.places?.AutocompleteService) return [];
    const { lat, lng } = getBiasPoint();
    const service = new maps.places.AutocompleteService();
    return await new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
          types: ['(regions)'],
          location: new maps.LatLng(lat, lng),
          radius: 50000,
        },
        (predictions, status) => {
          if (status !== maps.places.PlacesServiceStatus.OK || !predictions) return resolve([]);
          resolve(predictions.slice(0, limit).map((p) => p.description.replace(/, India$/, '')));
        }
      );
    });
  } catch (err) {
    console.warn('Google Places autocomplete failed', err);
    return [];
  }
};

/**
 * Google Places predictions (India only) shaped for the partner wizards' address search:
 * [{ name, display_name, placeId }]. Coordinates are fetched on selection via resolvePlaceDetails.
 * Resolves [] on failure so callers can fall back to the backend search.
 */
export const searchPlaceResults = async (query, limit = 6) => {
  try {
    const maps = await loadGoogleMaps();
    if (!maps?.places?.AutocompleteService) return [];
    const { lat, lng } = getBiasPoint();
    const service = new maps.places.AutocompleteService();
    return await new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
          location: new maps.LatLng(lat, lng),
          radius: 50000,
        },
        (predictions, status) => {
          if (status !== maps.places.PlacesServiceStatus.OK || !predictions) return resolve([]);
          resolve(
            predictions.slice(0, limit).map((p) => ({
              name: p.structured_formatting?.main_text || p.description,
              display_name: p.description,
              placeId: p.place_id,
            }))
          );
        }
      );
    });
  } catch (err) {
    console.warn('Google Places search failed', err);
    return [];
  }
};

const toPlaceDetails = (result) => {
  const loc = result?.geometry?.location;
  if (!loc) return null;
  const get = (type) => result.address_components?.find((c) => c.types?.includes(type))?.long_name || '';
  return {
    lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
    lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
    country: get('country'),
    state: get('administrative_area_level_1'),
    city: get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2'),
    area: get('sublocality') || get('sublocality_level_1') || get('neighborhood'),
    pincode: get('postal_code'),
    fullAddress: result.formatted_address || '',
  };
};

/** Resolves a Google place id to { lat, lng, country, state, city, area, pincode, fullAddress }, or null. */
export const resolvePlaceDetails = async (placeId) => {
  try {
    const maps = await loadGoogleMaps();
    if (maps?.Geocoder) {
      const viaJs = await new Promise((resolve) => {
        new maps.Geocoder().geocode({ placeId }, (results, status) => {
          resolve(status === 'OK' ? toPlaceDetails(results?.[0]) : null);
        });
      });
      if (viaJs) return viaJs;
    }
  } catch (err) {
    console.warn('Geocoder (JS) failed', err);
  }

  // Fallback: Geocoding REST API with the same key
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`
    );
    const data = await res.json();
    return data.status === 'OK' ? toPlaceDetails(data.results?.[0]) : null;
  } catch (err) {
    console.warn('Geocoding by place_id failed', err);
    return null;
  }
};

/**
 * Live India-only place suggestions for `query`. Always resolves (empty array on failure).
 */
export const fetchIndianPlaces = async (query, limit = 6) => {
  const googlePlaces = await fetchGooglePlaces(query, limit);
  if (googlePlaces.length > 0) return googlePlaces;

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
        return data.results
          .map((item) => item.formatted_address)
          .filter((addr) => addr && addr.toLowerCase() !== 'india') // bare country is not a useful suggestion
          .slice(0, limit);
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

/** Best-effort address fields parsed from a suggestion like "Sector 62, Noida, Uttar Pradesh, India". */
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
