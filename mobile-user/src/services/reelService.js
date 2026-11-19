import axios from 'axios';
import { api } from './apiService';

// RN: `file` is { uri, name, type } from the picker (FormData accepts this shape natively)
const buildForm = (file, caption, category, extra) => {
  const form = new FormData();
  form.append('video', { uri: file.uri, name: file.name || 'reel.mp4', type: file.type || 'video/mp4' });
  form.append('caption', caption != null ? String(caption).trim().slice(0, 500) : '');
  form.append('category', category);
  ['propertyId', 'city', 'state', 'lat', 'lng', 'durationPaymentId', 'razorpay_order_id', 'razorpay_payment_id'].forEach((k) => {
    if (extra[k]) form.append(k, String(extra[k]));
  });
  if (extra.hashtags) form.append('hashtags', Array.isArray(extra.hashtags) ? extra.hashtags.join(',') : extra.hashtags);
  return form;
};

// Direct upload to Cloudinary with a server-signed request (bare axios so our auth token is NOT sent to Cloudinary)
const uploadDirectToCloudinary = async (file, onProgress) => {
  const sigRes = await api.get('/reels/upload-signature');
  const { cloudName, apiKey, timestamp, folder, signature } = sigRes.data || {};
  if (!cloudName || !apiKey || !signature) throw new Error('Upload signature unavailable');
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name || 'reel.mp4', type: file.type || 'video/mp4' });
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);
  const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, form, {
    timeout: 600000,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => { if (typeof onProgress === 'function') onProgress(e); },
  });
  if (!res.data?.public_id) throw new Error('Cloudinary did not return a video id');
  return res.data.public_id;
};

export const reelService = {
  getFeed: (params = {}) => api.get('/reels/feed', { params: { page: 1, limit: 10, ...params } }).then((r) => r.data),

  getReelById: (id) => api.get(`/reels/${id}`).then((r) => r.data),

  uploadReel: async (file, caption = '', category = 'General', extra = {}, onProgress = null) => {
    if (!file || !file.uri) throw new Error('No video file provided for upload');
    let publicId = null;
    try {
      publicId = await uploadDirectToCloudinary(file, onProgress);
    } catch (e) { /* fall back to server upload */ }
    if (publicId) {
      return api.post('/reels/upload', {
        videoPublicId: publicId,
        caption: caption != null ? String(caption).trim().slice(0, 500) : '',
        category,
        ...extra,
      }, { timeout: 120000 }).then((r) => r.data);
    }
    return api.post('/reels/upload', buildForm(file, caption, category, extra), {
      timeout: 600000,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (onProgress) onProgress(e); },
    }).then((r) => r.data);
  },

  getDurationSettings: () => api.get('/reels/duration-settings').then((r) => r.data),
  quoteDuration: (duration) => api.post('/reels/duration-quote', { duration }).then((r) => r.data),
  createDurationPaymentOrder: (duration) => api.post('/reels/duration-payment/create-order', { duration }).then((r) => r.data),
  verifyDurationPayment: (payload) => api.post('/reels/duration-payment/verify', payload).then((r) => r.data),
  like: (id) => api.post(`/reels/like/${id}`).then((r) => r.data),
  toggleSave: (id) => api.post(`/reels/save/${id}`).then((r) => r.data),
  getMyReels: (params = {}) => api.get('/reels/my', { params: { page: 1, limit: 12, ...params } }).then((r) => r.data),
  getSavedReels: () => api.get('/reels/saved').then((r) => r.data),
  trackWatch: (id, payload = {}) => api.post(`/reels/${id}/track-watch`, payload).then((r) => r.data),
  recordPropertyClick: (id) => api.post(`/reels/${id}/property-click`).then((r) => r.data),
  setNotInterested: (id) => api.post(`/reels/${id}/not-interested`).then((r) => r.data),
  comment: (id, text, parentComment = null) => api.post(`/reels/comment/${id}`, { text, parentComment }).then((r) => r.data),
  deleteComment: (commentId) => api.delete(`/reels/comment/${commentId}`).then((r) => r.data),
  getComments: (id, params = {}) => api.get(`/reels/${id}/comments`, { params }).then((r) => r.data),
  share: (id) => api.post(`/reels/share/${id}`).then((r) => r.data),
  recordView: (id, watchedSeconds) => api.post(`/reels/${id}/view`, { watchedSeconds }).then((r) => r.data),
  deleteReel: (id) => api.delete(`/reels/${id}`).then((r) => r.data),
  getMostViewed: (params = {}) => api.get('/reels/most-viewed', { params }).then((r) => r.data),
};
