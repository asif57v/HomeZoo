import axios from 'axios';
import { uploadToCloudinary, uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

/** Google Maps API key: prefer GOOGLE_MAP_API_KEY, fallback GOOGLE_MAPS_API_KEY, trimmed */
function getMapsApiKey() {
  const key = (process.env.GOOGLE_MAP_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
  return key || null;
}

const mapAddressComponents = (components) => {
  const get = (type) => {
    const c = components.find((x) => x.types?.includes(type));
    return c ? c.long_name : '';
  };
  const country = get('country');
  const state = get('administrative_area_level_1');
  const city = get('locality') || get('administrative_area_level_2') || get('sublocality');
  const area = get('sublocality') || get('neighborhood') || '';
  const pincode = get('postal_code');
  return { country, state, city, area, pincode };
};

/**
 * @desc    Upload Images (Hotel/Property)
 * @route   POST /api/hotels/upload
 * @access  Private (Partner/Admin)
 */
export const uploadImages = async (req, res) => {
  try {
    console.log(`[Upload Images] Received ${req.files ? req.files.length : 0} files`);

    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadPromises = req.files.map(file =>
      uploadToCloudinary(file.path, 'properties')
    );

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    const urls = results.map(result => result.url);

    console.log(`[Upload Images] Successfully uploaded ${files.length} images`);

    res.json({ success: true, files, urls });
  } catch (error) {
    console.error('Upload Images Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

/**
 * @desc    Upload Images via Base64 (Flutter Camera)
 * @route   POST /api/hotels/upload-base64
 * @access  Private (Partner/Admin)
 */
export const uploadImagesBase64 = async (req, res) => {
  try {
    const { images } = req.body; // Array of {base64, mimeType, fileName}

    console.log(`[Upload Images Base64] Received ${images ? images.length : 0} images`);

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadPromises = images.map(async (img, index) => {
      if (!img.base64) {
        throw new Error(`Image ${index + 1} missing base64 data`);
      }

      const publicId = img.fileName
        ? `${Date.now()}-${img.fileName.replace(/\.[^/.]+$/, '')}`
        : null;

      return uploadBase64ToCloudinary(img.base64, 'properties', publicId);
    });

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    const urls = results.map(result => result.url);

    console.log(`[Upload Images Base64] Successfully uploaded ${files.length} images`);

    res.json({ success: true, files, urls });
  } catch (error) {
    console.error('Upload Images Base64 Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

// Fallback search using OpenStreetMap Nominatim
const searchLocationOSM = async (query, { indiaOnly = false } = {}) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10${indiaOnly ? '&countrycodes=in' : ''}`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'HomeZoo-App/1.0 (contact@homezoo.com)' },
      timeout: 6000,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        name: r.display_name || r.name || query,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        type: 'address'
      }));
    }
  } catch (err) {
    console.warn('[searchLocationOSM] Fallback error:', err.message);
  }
  return [];
};

// Fallback reverse geocode using OpenStreetMap Nominatim
const getAddressFromCoordinatesOSM = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'HomeZoo-App/1.0 (contact@homezoo.com)' },
      timeout: 6000,
    });
    if (data && data.address) {
      const addr = data.address;
      return {
        country: addr.country || '',
        state: addr.state || '',
        city: addr.city || addr.town || addr.village || addr.county || addr.state_district || '',
        area: addr.suburb || addr.neighbourhood || addr.city_district || addr.road || '',
        fullAddress: data.display_name || '',
        pincode: addr.postcode || '',
        latitude: Number(lat),
        longitude: Number(lng),
      };
    }
  } catch (err) {
    console.warn('[getAddressFromCoordinatesOSM] Fallback error:', err.message);
  }
  return null;
};

export const getAddressFromCoordinates = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'lat and lng must be numbers' });
    }

    const key = getMapsApiKey();
    if (key) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
        const { data } = await axios.get(url, { timeout: 6000 });

        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const first = data.results[0];
          const { country, state, city, area, pincode } = mapAddressComponents(first.address_components || []);
          return res.json({
            success: true,
            country,
            state,
            city,
            area,
            fullAddress: first.formatted_address || '',
            pincode,
            latitude: lat,
            longitude: lng
          });
        }
        console.warn('[getAddressFromCoordinates] Google API status:', data.status, data.error_message);
      } catch (googleErr) {
        console.warn('[getAddressFromCoordinates] Google API failed, falling back to OSM:', googleErr.message);
      }
    }

    // Fallback to OSM Nominatim
    const osmResult = await getAddressFromCoordinatesOSM(lat, lng);
    if (osmResult) {
      return res.json({
        success: true,
        ...osmResult
      });
    }

    return res.status(404).json({ message: 'Address not found for these coordinates' });
  } catch (e) {
    console.error('[getAddressFromCoordinates] Error:', e.message);
    res.status(500).json({ message: e.message || 'Location fetch failed' });
  }
};

export const searchLocation = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ message: 'query is required' });
    }

    const q = String(query).trim();
    const key = getMapsApiKey();

    // India first: restrict to India, and only widen to the whole world if nothing matches
    if (key) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          q
        )}&key=${key}&components=country:IN`;
        const { data } = await axios.get(url, { timeout: 6000 });

        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const results = data.results.map((r) => ({
            name: r.formatted_address || q,
            lat: r.geometry?.location?.lat,
            lng: r.geometry?.location?.lng,
            type: 'address'
          }));
          return res.json({ success: true, results });
        }

        if (data.status !== 'ZERO_RESULTS') {
          console.warn('[searchLocation] Google API non-OK status:', data.status, data.error_message);
        }
      } catch (googleErr) {
        console.warn('[searchLocation] Google API error, falling back to OSM:', googleErr.message);
      }
    }

    // OSM Nominatim: India first, then worldwide
    const indiaResults = await searchLocationOSM(q, { indiaOnly: true });
    if (indiaResults.length > 0) {
      return res.json({ success: true, results: indiaResults });
    }
    const osmResults = await searchLocationOSM(q);
    if (osmResults.length > 0) {
      return res.json({ success: true, results: osmResults });
    }

    // Return empty results rather than throwing 400/500
    return res.json({ success: true, results: [] });
  } catch (e) {
    const msg = e.response?.data?.error_message || e.response?.data?.message || e.message;
    console.error('[searchLocation] Error:', msg);
    res.status(500).json({ message: msg || 'Location search failed' });
  }
};

export const calculateDistance = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;
    const toNum = (v) => Number(v);
    const oLat = toNum(originLat);
    const oLng = toNum(originLng);
    const dLat = toNum(destLat);
    const dLng = toNum(destLng);
    if ([oLat, oLng, dLat, dLng].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLatR = toRad(dLat - oLat);
    const dLngR = toRad(dLng - oLng);
    const a =
      Math.sin(dLatR / 2) * Math.sin(dLatR / 2) +
      Math.cos(toRad(oLat)) * Math.cos(toRad(dLat)) * Math.sin(dLngR / 2) * Math.sin(dLngR / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;
    res.json({ success: true, distanceKm: Number(km.toFixed(2)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * @desc    Delete Image from Cloudinary
 * @route   POST /api/hotels/delete-image
 * @access  Private (Partner/Admin)
 */
export const deleteImage = async (req, res) => {
  try {
    const { publicId, url } = req.body;

    let pid = publicId;

    // If no publicId but URL is provided, try to extract it
    if (!pid && url) {
      // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v12345678/rukkoin/properties/filename.jpg
      // Public ID would be: rukkoin/properties/filename
      const parts = url.split('/');
      const filename = parts.pop(); // filename.jpg
      const folder2 = parts.pop(); // properties
      const folder1 = parts.pop(); // rukkoin
      pid = `${folder1}/${folder2}/${filename.split('.')[0]}`;
    }

    if (!pid) {
      return res.status(400).json({ message: 'publicId or url is required' });
    }

    console.log(`[Delete Image] Attempting to delete: ${pid}`);
    const result = await deleteFromCloudinary(pid);

    res.json(result);
  } catch (error) {
    console.error('Delete Image Error:', error);
    res.status(500).json({ message: error.message || 'Deletion failed' });
  }
};

/**
 * @desc    Update FCM Token for Partner (Push Notifications)
 * @route   PUT /api/partners/fcm-token
 * @access  Private (Partner only)
 */
export const updatePartnerFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform = 'web' } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }

    const partner = req.user; // Set by protect middleware (Partner document)

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    // Ensure fcmTokens object exists
    if (!partner.fcmTokens) {
      partner.fcmTokens = { app: null, web: null };
    }

    // Save to 'app' or 'web' based on platform param (default: 'web')
    const targetPlatform = platform === 'app' ? 'app' : 'web';
    partner.fcmTokens[targetPlatform] = fcmToken;

    // markModified ensures Mongoose tracks nested object changes
    partner.markModified('fcmTokens');

    await partner.save();

    // Also sync to User model if exists
    try {
      const User = (await import('../models/User.js')).default;
      const userDoc = await User.findById(partner._id);
      if (userDoc) {
        if (!userDoc.fcmTokens) userDoc.fcmTokens = { app: null, web: null };
        userDoc.fcmTokens[targetPlatform] = fcmToken;
        if (typeof userDoc.markModified === 'function') userDoc.markModified('fcmTokens');
        await userDoc.save();
      }
    } catch (e) {
      console.warn('Sync to User FCM token failed:', e.message);
    }

    console.log(`[Partner FCM] Token updated for partner: ${partner._id} | platform: ${targetPlatform}`);

    res.json({
      success: true,
      message: `FCM token updated successfully for ${targetPlatform}`,
      platform: targetPlatform
    });
  } catch (error) {
    console.error('Update Partner FCM Token Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating FCM token' });
  }
};
