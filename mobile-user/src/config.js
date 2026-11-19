import Constants from 'expo-constants';

// Production backend (same one the web app uses: frontend/.env VITE_API_URL history -> https://hoomzo.com/api)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'https://hoomzo.com/api';

export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// Public/client-side keys only (copied from frontend/.env). No secrets.
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_8sYbzHWidwe5Zw';
export const GOOGLE_MAP_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY || 'AIzaSyCV6QreLE4QR76xie0BI3B9y2wY4awcPP8';
export const REQUEST_TIMEOUT = 30000;
