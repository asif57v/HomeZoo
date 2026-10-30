// Shared user location (city + coordinates) used by the home page feeds.
// Stored in localStorage and broadcast with a window event so every
// component updates as soon as the location is detected or changed.

export const LOCATION_EVENT = 'hoomzo:location-change';
export const DEFAULT_CITY = 'Indore';

export const getStoredLocation = () => {
  let coords = null;
  try {
    coords = JSON.parse(localStorage.getItem('user_coords') || 'null');
  } catch {
    coords = null;
  }
  const rawCity = localStorage.getItem('user_location') || DEFAULT_CITY;
  const parts = rawCity.split(',');
  const city = (parts.length > 1 ? parts[parts.length - 1] : rawCity).trim();
  const hasCoords = coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng));
  return {
    label: rawCity,
    city,
    lat: hasCoords ? Number(coords.lat) : null,
    lng: hasCoords ? Number(coords.lng) : null
  };
};

// coords: { lat, lng } or null (null clears old coordinates, e.g. for a typed city)
export const setStoredLocation = (label, coords) => {
  if (label) localStorage.setItem('user_location', label);
  if (coords && coords.lat != null && coords.lng != null) {
    localStorage.setItem('user_coords', JSON.stringify({ lat: coords.lat, lng: coords.lng }));
  } else {
    localStorage.removeItem('user_coords');
  }
  window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: getStoredLocation() }));
};

export const subscribeLocation = (callback) => {
  const handler = () => callback(getStoredLocation());
  window.addEventListener(LOCATION_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(LOCATION_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};
