// Shared user location (city + coordinates) used by the home feeds. AsyncStorage-backed with an event bus (web used localStorage + window events)
import { storage } from '../lib/storage';
import { on, emit } from '../lib/events';
import { GOOGLE_MAP_API_KEY } from '../config';
import * as Location from 'expo-location';

export const LOCATION_EVENT = 'hoomzo:location-change';
export const DEFAULT_CITY = 'Indore';

export const getStoredLocation = () => {
  let coords = null;
  try { coords = JSON.parse(storage.getItem('user_coords') || 'null'); } catch { coords = null; }
  const rawCity = storage.getItem('user_location') || DEFAULT_CITY;
  const parts = rawCity.split(',');
  const city = (parts.length > 1 ? parts[parts.length - 1] : rawCity).trim();
  const hasCoords = coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng));
  return { label: rawCity, city, lat: hasCoords ? Number(coords.lat) : null, lng: hasCoords ? Number(coords.lng) : null };
};

export const setStoredLocation = (label, coords) => {
  if (label) storage.setItem('user_location', label);
  if (coords && coords.lat != null && coords.lng != null) storage.setItem('user_coords', JSON.stringify({ lat: coords.lat, lng: coords.lng }));
  else storage.removeItem('user_coords');
  emit(LOCATION_EVENT, getStoredLocation());
};

export const subscribeLocation = (callback) => on(LOCATION_EVENT, () => callback(getStoredLocation()));

const joinAreaCity = (area, city) => {
  if (area && city && area.toLowerCase() !== city.toLowerCase()) return `${area}, ${city}`;
  return city || area || null;
};

// Reverse geocode coordinates into an "Area, City" label (Google -> Nominatim -> BigDataCloud, same as web)
export const reverseGeocode = async (latitude, longitude) => {
  if (GOOGLE_MAP_API_KEY) {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAP_API_KEY}`);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const components = data.results.flatMap((r) => r.address_components);
        const pick = (...types) => {
          for (const t of types) { const c = components.find((comp) => comp.types.includes(t)); if (c) return c.long_name; }
          return null;
        };
        const city = pick('locality', 'administrative_area_level_3', 'administrative_area_level_2');
        const area = pick('sublocality_level_1', 'sublocality', 'neighborhood', 'sublocality_level_2', 'route');
        const label = joinAreaCity(area, city);
        if (label) return label;
      }
    } catch {}
  }
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&addressdetails=1&lat=${latitude}&lon=${longitude}`);
    const data = await response.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.state_district || addr.county;
    const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.city_district || addr.road;
    const label = joinAreaCity(area, city);
    if (label) return label;
  } catch {}
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
    const data = await response.json();
    const label = joinAreaCity(data.locality, data.city || data.principalSubdivision);
    if (label) return label;
  } catch {}
  return null;
};

// Ask permission (on first use) and return { lat, lng } or throw
export const getCurrentCoords = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
};
