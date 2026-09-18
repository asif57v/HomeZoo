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
 * Clears stale Firebase IndexedDB databases that cause VersionError.
 * Unregisters service workers first to release DB locks, then forces page reload.
 */
const clearFirebaseIndexedDBsAndReload = async () => {
  console.warn('[FCM] Clearing stale Firebase databases and reloading page...');

  // 1. Unregister all service workers to release IndexedDB locks
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  }

  // 2. Wait for SW to release handles
  await new Promise(r => setTimeout(r, 500));

  // 3. Delete stale IndexedDB databases
  const dbNames = [
    'firebase-messaging-database',
    'firebase-installations-database',
    'fcm_token_details_db',
    'firebase-heartbeat-database',
    'firebase-installations-store',
  ];
  for (const name of dbNames) {
    try {
      indexedDB.deleteDatabase(name);
    } catch (e) {
      // ignore
    }
  }

  // 4. Mark that we've cleared DBs, then reload page so Firebase SDK starts fresh
  sessionStorage.setItem('fcm_db_cleared', 'true');
  await new Promise(r => setTimeout(r, 300));
  window.location.reload();
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

      try {
        const token = await getToken(messagingInstance, tokenOptions);
        if (token) {
          console.log('[FCM] Token retrieved successfully:', token.substring(0, 15) + '...');
          // Clear the recovery flag if it was set
          sessionStorage.removeItem('fcm_db_cleared');
          return token;
        }
        console.warn('No FCM token received');
      } catch (error) {
        // Handle VersionError - stale IndexedDB from previous Firebase SDK
        if (
          error.name === 'VersionError' ||
          error.message?.includes('VersionError') ||
          error.message?.includes('version')
        ) {
          // Only try auto-recovery once per session to avoid infinite reload loops
          if (!sessionStorage.getItem('fcm_db_cleared')) {
            await clearFirebaseIndexedDBsAndReload();
            // Page will reload, so we won't reach here
            return null;
          } else {
            console.error('[FCM] VersionError persists after DB cleanup. Please clear site data manually.');
            sessionStorage.removeItem('fcm_db_cleared');
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
