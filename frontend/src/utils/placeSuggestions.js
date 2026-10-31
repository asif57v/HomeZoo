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
  village: 2,
  hamlet: 3,
  isolated_dwelling: 3,
  city_block: 3,
  county: 3,
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

const fetchGooglePlaceResults = async (query, limit) => {
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
            predictions
              .filter((p) => !p.types?.includes('country'))
              .slice(0, limit)
              .map((p) => ({
                name: p.structured_formatting?.main_text || p.description,
                display_name: p.description,
                formatted_address: (p.structured_formatting?.secondary_text || '').replace(/,?\s*India$/, ''),
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

// Nominatim fallback with coordinates, so a result can be selected without a Google place id
const fetchNominatimPlaceResults = async (query, limit) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=${limit}&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .filter((item) => item.addresstype !== 'country' && item.type !== 'country')
      .map((item) => {
        const a = item.address || {};
        const name = item.name || a.suburb || a.neighbourhood || a.village || a.town || a.city;
        if (!name) return null;
        const rest = [a.suburb, a.city || a.town || a.village || a.county, a.state, a.postcode]
          .filter((part, i, arr) => part && part !== name && arr.indexOf(part) === i);
        return {
          name,
          display_name: [name, ...rest].join(', '),
          formatted_address: rest.join(', '),
          lat: Number(item.lat),
          lng: Number(item.lon),
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('Nominatim place search failed', err);
    return [];
  }
};

/**
 * India-only address suggestions for the partner wizards' address search:
 * [{ name, display_name, formatted_address, placeId? , lat?, lng? }]. Google results carry a
 * placeId (coordinates fetched on selection via resolvePlaceDetails); Nominatim results carry lat/lng.
 * Never returns the bare country. Resolves [] on failure so callers can fall back to the backend search.
 */
export const searchPlaceResults = async (query, limit = 6) => {
  const google = await fetchGooglePlaceResults(query, limit);
  if (google.length) return google;
  return fetchNominatimPlaceResults(query, limit);
};

/** Drops country-only hits (e.g. a bare "India") from backend location search results. */
export const withoutCountryOnly = (results = []) =>
  results.filter((r) => {
    const label = String(r?.name || r?.display_name || r?.formatted_address || '').trim().toLowerCase();
    return label && label !== 'india';
  });

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

const fetchPhotonPlaces = async (query, limit) => {
  const { lat, lng } = getBiasPoint();
  try {
    // Ask for many hits: most of the world's matches are filtered out below
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=30&lang=en&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return (data?.features || [])
      .map((f) => f.properties || {})
      .filter((p) => p.countrycode === 'IN' && p.name && p.osm_key === 'place' && p.osm_value in PLACE_RANK)
      .sort((a, b) => PLACE_RANK[a.osm_value] - PLACE_RANK[b.osm_value])
      .map(formatPlace)
      .slice(0, limit);
  } catch (err) {
    console.warn('Photon autocomplete failed', err);
    return [];
  }
};

// OpenStreetMap Nominatim: good coverage of small localities and villages across India
const fetchNominatimPlaces = async (query, limit) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=${limit}&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .map((item) => {
        const a = item.address || {};
        const name = item.name || a.suburb || a.neighbourhood || a.village || a.town || a.city;
        if (!name) return null;
        const area = a.city || a.town || a.village || a.county || a.state_district;
        const parts = [name];
        if (area && area.toLowerCase() !== name.toLowerCase()) parts.push(area);
        if (a.state) parts.push(a.state);
        return parts.join(', ');
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('Nominatim autocomplete failed', err);
    return [];
  }
};

const fetchGeocodePlaces = async (query, limit) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&components=country:in`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results) return [];
    return data.results
      .map((item) => item.formatted_address)
      .filter((addr) => addr && addr.toLowerCase() !== 'india') // bare country is not a useful suggestion
      .slice(0, limit);
  } catch (err) {
    console.warn('Geocoding suggestions error', err);
    return [];
  }
};

/**
 * Live India-only place suggestions for `query`. Always resolves (empty array on failure).
 * Results from several sources are merged so small localities (e.g. "Ranipura") still show up
 * when one provider doesn't know them.
 */
export const fetchIndianPlaces = async (query, limit = 8) => {
  const google = await fetchGooglePlaces(query, limit);
  const all = [...google];

  if (all.length < limit) {
    const [photon, nominatim] = await Promise.all([
      fetchPhotonPlaces(query, limit),
      fetchNominatimPlaces(query, limit),
    ]);
    all.push(...photon, ...nominatim);
  }
  if (all.length === 0) all.push(...(await fetchGeocodePlaces(query, limit)));

  const seen = new Set();
  return all.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit + 4);
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
export const rankLocations = (rawQuery, { listings = [], curated = [], live = [] }, max = 12) => {
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
