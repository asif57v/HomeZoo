import { api } from './apiService';

export const reelService = {
    getFeed: (params = {}) =>
        api.get('/reels/feed', { params: { limit: 10, ...params } }).then((r) => r.data),

    getReelById: (id) => api.get(`/reels/${id}`).then((r) => r.data),

    uploadReel: (file, caption = '', category = 'General', extra = {}) => {
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

        return api
            .post('/reels/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000, // 5 minutes timeout
            })
            .then((r) => r.data);
    },

    like: (id) => api.post(`/reels/like/${id}`).then((r) => r.data),

    toggleSave: (id) => api.post(`/reels/save/${id}`).then((r) => r.data),

    getSavedReels: () => api.get('/reels/saved').then((r) => r.data),

    trackWatch: (id, payload = {}) =>
        api.post(`/reels/${id}/track-watch`, payload).then((r) => r.data),

    recordPropertyClick: (id) =>
        api.post(`/reels/${id}/property-click`).then((r) => r.data),

    setNotInterested: (id) =>
        api.post(`/reels/${id}/not-interested`).then((r) => r.data),

    comment: (id, text, parentComment = null) =>
        api.post(`/reels/comment/${id}`, { text, parentComment }).then((r) => r.data),

    getComments: (id, params = {}) =>
        api.get(`/reels/${id}/comments`, { params }).then((r) => r.data),

    share: (id) => api.post(`/reels/share/${id}`).then((r) => r.data),

    recordView: (id, watchedSeconds) =>
        api.post(`/reels/${id}/view`, { watchedSeconds }).then((r) => r.data),

    deleteReel: (id) => api.delete(`/reels/${id}`).then((r) => r.data),

    getMostViewed: (params = {}) =>
        api.get('/reels/most-viewed', { params }).then((r) => r.data),
};
