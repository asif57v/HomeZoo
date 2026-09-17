import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// VAPID KEY - Replace with yours from Firebase Console -> Cloud Messaging -> Web Configuration
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const app = initializeApp(firebaseConfig);

let messaging = null;

const getMessagingInstance = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (!messaging) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.error('Failed to initialize Firebase Messaging:', error);
      }
    }
    return messaging;
  }
  return null;
};

export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messagingInstance = getMessagingInstance();
      if (!messagingInstance) return null;

      try {
        let swRegistration = null;
        if ('serviceWorker' in navigator) {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('[FCM] Service worker registered with scope:', swRegistration.scope);
        }

        const tokenOptions = { vapidKey };
        if (swRegistration) {
          tokenOptions.serviceWorkerRegistration = swRegistration;
        }

        const token = await getToken(messagingInstance, tokenOptions);
        if (token) {
          console.log('[FCM] Token retrieved successfully:', token.substring(0, 15) + '...');
          return token;
        } else {
          console.warn('No FCM token received');
        }
      } catch (error) {
        console.error('Error getting FCM token:', error);
      }
    } else {
      console.warn('Notification permission denied');
    }
    return null;
  } catch (error) {
    console.error('Error requesting permission:', error);
    return null;
  }
};

export const onMessageListener = (callback) => {
  const messagingInstance = getMessagingInstance();
  if (messagingInstance) {
    onMessage(messagingInstance, (payload) => {
      if (callback) callback(payload);
    });
  }
};

/**
 * Detects whether the current client is a Mobile App (Flutter WebView / Native) or Web Browser
 * @returns {'app' | 'web'}
 */
export const detectPlatform = () => {
  if (typeof window !== 'undefined') {
    if (
      window.flutter_inappwebview !== undefined ||
      window.flutter !== undefined ||
      navigator.userAgent.includes('FlutterWebView') ||
      window.NativeApp !== undefined
    ) {
      return 'app';
    }
  }
  return 'web';
};

export default app;
