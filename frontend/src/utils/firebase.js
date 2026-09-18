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

/**
 * Clears stale Firebase IndexedDB databases that cause VersionError
 */
const clearFirebaseIndexedDBs = async () => {
  const dbNames = [
    'firebase-messaging-database',
    'firebase-installations-database',
    'fcm_token_details_db',
    'firebase-heartbeat-database',
  ];
  for (const name of dbNames) {
    try {
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve(); // proceed anyway
      });
      console.log(`[FCM] Cleared stale IndexedDB: ${name}`);
    } catch (e) {
      // ignore - DB may not exist
    }
  }
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

      let swRegistration = null;
      if ('serviceWorker' in navigator) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[FCM] Service worker registered with scope:', swRegistration.scope);
      }

      const tokenOptions = { vapidKey };
      if (swRegistration) {
        tokenOptions.serviceWorkerRegistration = swRegistration;
      }

      // First attempt
      try {
        const token = await getToken(messagingInstance, tokenOptions);
        if (token) {
          console.log('[FCM] Token retrieved successfully:', token.substring(0, 15) + '...');
          return token;
        }
        console.warn('No FCM token received');
      } catch (error) {
        // Handle VersionError - stale IndexedDB from previous Firebase SDK
        if (error.name === 'VersionError' || error.message?.includes('VersionError') || error.message?.includes('version')) {
          console.warn('[FCM] IndexedDB VersionError detected. Clearing stale databases and retrying...');
          await clearFirebaseIndexedDBs();

          // Re-initialize messaging after clearing DBs
          messaging = null;
          const freshMessaging = getMessagingInstance();
          if (!freshMessaging) return null;

          try {
            const retryToken = await getToken(freshMessaging, tokenOptions);
            if (retryToken) {
              console.log('[FCM] Token retrieved on retry:', retryToken.substring(0, 15) + '...');
              return retryToken;
            }
          } catch (retryError) {
            console.error('[FCM] Retry also failed:', retryError);
          }
        } else {
          console.error('Error getting FCM token:', error);
        }
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
