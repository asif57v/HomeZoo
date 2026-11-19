import { api } from './apiService';

const subscriptionService = {
    // --- PARTNER --- (use api instance which adds JWT token automatically)
    getActivePlans: async () => {
        const response = await api.get('/subscriptions/plans');
        return response.data;
    },

    getCurrentSubscription: async () => {
        const response = await api.get('/subscriptions/current');
        return response.data;
    },

    createSubscriptionOrder: async (planId) => {
        const response = await api.post('/subscriptions/checkout', { planId });
        return response.data;
    },

    verifySubscription: async (paymentData) => {
        const response = await api.post('/subscriptions/verify', paymentData);
        return response.data;
    },

    togglePause: async () => {
        const response = await api.post('/subscriptions/toggle-pause');
        return response.data;
    }
};


export default subscriptionService;
