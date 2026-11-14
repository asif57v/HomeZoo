import axios from 'axios';
import { api } from './apiService';

/**
 * Upload a video directly to Cloudinary using a server-signed request.
 * Uses a bare axios call so our auth token is NOT sent to Cloudinary.
 * Returns the Cloudinary public_id.
 */
const uploadDirectToCloudinary = async (file, onProgress) => {
    const sigRes = await api.get('/reels/upload-signature');
    const { cloudName, apiKey, timestamp, folder, signature } = sigRes.data || {};
    if (!cloudName || !apiKey || !signature) throw new Error('Upload signature unavailable');

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', apiKey);
    form.append('timestamp', timestamp);
    form.append('folder', folder);
    form.append('signature', signature);

    const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, form, {
        timeout: 600000,
        onUploadProgress: (e) => {
            if (typeof onProgress === 'function') onProgress(e);
        },
    });
    if (!res.data?.public_id) throw new Error('Cloudinary did not return a video id');
    return res.data.public_id;
};

export const reelService = {
    getFeed: (params = {}) =>
        api
            .get('/reels/feed', {
                params: {
                    page: 1,
                    limit: 10,
                    ...params,
                },
            })
            .then((r) => r.data),

    getReelById: (id) => api.get(`/reels/${id}`).then((r) => r.data),

    uploadReel: async (file, caption = '', category = 'General', extra = {}, onProgress = null) => {
        const isFileOrBlob = file instanceof Blob || file instanceof File || (file && file.size);

        // Preferred: upload straight to Cloudinary (no server hop, works on weak devices/networks),
        // then send only the metadata to our server.
        if (isFileOrBlob && typeof Blob !== 'undefined' && file instanceof Blob) {
            let publicId = null;
            try {
                publicId = await uploadDirectToCloudinary(file, onProgress);
            } catch (directErr) {
                console.warn('[Reel Upload] Direct Cloudinary upload failed, falling back to server upload...', directErr);
            }
            if (publicId) {
                return await api
                    .post(
                        '/reels/upload',
                        {
                            videoPublicId: publicId,
                            caption: caption != null ? String(caption).trim().slice(0, 500) : '',
                            category,
                            ...extra,
                        },
                        { timeout: 120000 }
                    )
                    .then((r) => r.data);
            }
        }

        // If file is a standard File or Blob, always use FormData multipart first (streaming, 33% less bandwidth)
        if (isFileOrBlob) {
            const formData = new FormData();
            formData.append('video', file);
            formData.append('caption', caption != null ? String(caption).trim().slice(0, 500) : '');
            formData.append('category', category);

            if (extra.propertyId) formData.append('propertyId', extra.propertyId);
            if (extra.hashtags) formData.append('hashtags', Array.isArray(extra.hashtags) ? extra.hashtags.join(',') : extra.hashtags);
            if (extra.city) formData.append('city', extra.city);
            if (extra.state) formData.append('state', extra.state);
            if (extra.lat) formData.append('lat', extra.lat);
            if (extra.lng) formData.append('lng', extra.lng);
            if (extra.durationPaymentId) formData.append('durationPaymentId', extra.durationPaymentId);
            if (extra.razorpay_order_id) formData.append('razorpay_order_id', extra.razorpay_order_id);
            if (extra.razorpay_payment_id) formData.append('razorpay_payment_id', extra.razorpay_payment_id);

            try {
                return await api
                    .post('/reels/upload', formData, {
                        timeout: 600000, // 10 minutes timeout for slow mobile networks
                        onUploadProgress: (progressEvent) => {
                            if (onProgress && typeof onProgress === 'function') {
                                onProgress(progressEvent);
                            }
                        },
                    })
                    .then((r) => r.data);
            } catch (err) {
                // If multipart fails and base64 is available as fallback, try JSON base64
                if (file?._base64 || extra.base64) {
                    console.warn('[Reel Upload] Multipart failed, falling back to base64 upload...', err);
                    const payload = {
                        base64: file._base64 || extra.base64,
                        caption: caption != null ? String(caption).trim().slice(0, 500) : '',
                        category,
                        ...extra,
                    };
                    return await api
                        .post('/reels/upload', payload, {
                            timeout: 600000,
                            onUploadProgress: (progressEvent) => {
                                if (onProgress && typeof onProgress === 'function') {
                                    onProgress(progressEvent);
                                }
                            },
                        })
                        .then((r) => r.data);
                }
                throw err;
            }
        }

        // Fallback for direct base64 object when no File/Blob is provided
        if (extra.base64 || file?._base64) {
            const payload = {
                base64: extra.base64 || file._base64,
                caption: caption != null ? String(caption).trim().slice(0, 500) : '',
                category,
                ...extra,
            };
            return api
                .post('/reels/upload', payload, {
                    timeout: 600000,
                    onUploadProgress: (progressEvent) => {
                        if (onProgress && typeof onProgress === 'function') {
                            onProgress(progressEvent);
                        }
                    },
                })
                .then((r) => r.data);
        }

        throw new Error('No video file provided for upload');
    },

    getDurationSettings: () =>
        api.get('/reels/duration-settings').then((r) => r.data),

    quoteDuration: (duration) =>
        api.post('/reels/duration-quote', { duration }).then((r) => r.data),

    createDurationPaymentOrder: (duration) =>
        api.post('/reels/duration-payment/create-order', { duration }).then((r) => r.data),

    verifyDurationPayment: (payload) =>
        api.post('/reels/duration-payment/verify', payload).then((r) => r.data),

    like: (id) => api.post(`/reels/like/${id}`).then((r) => r.data),

    toggleSave: (id) => api.post(`/reels/save/${id}`).then((r) => r.data),

    getMyReels: (params = {}) =>
        api
            .get('/reels/my', {
                params: {
                    page: 1,
                    limit: 12,
                    ...params,
                },
            })
            .then((r) => r.data),

    getSavedReels: () => api.get('/reels/saved').then((r) => r.data),

    trackWatch: (id, payload = {}) =>
        api.post(`/reels/${id}/track-watch`, payload).then((r) => r.data),

    recordPropertyClick: (id) =>
        api.post(`/reels/${id}/property-click`).then((r) => r.data),

    setNotInterested: (id) =>
        api.post(`/reels/${id}/not-interested`).then((r) => r.data),

    comment: (id, text, parentComment = null) =>
        api.post(`/reels/comment/${id}`, { text, parentComment }).then((r) => r.data),

    deleteComment: (commentId) =>
        api.delete(`/reels/comment/${commentId}`).then((r) => r.data),

    getComments: (id, params = {}) =>
        api.get(`/reels/${id}/comments`, { params }).then((r) => r.data),

    share: (id) => api.post(`/reels/share/${id}`).then((r) => r.data),

    recordView: (id, watchedSeconds) =>
        api.post(`/reels/${id}/view`, { watchedSeconds }).then((r) => r.data),

    deleteReel: (id) => api.delete(`/reels/${id}`).then((r) => r.data),

    getMostViewed: (params = {}) =>
        api.get('/reels/most-viewed', { params }).then((r) => r.data),
};
