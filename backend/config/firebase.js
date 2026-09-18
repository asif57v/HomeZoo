import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdmin = null;

export const initializeFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.app();
      return firebaseAdmin;
    }

    // Option 1: Load from FIREBASE_SERVICE_ACCOUNT JSON environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const parsed = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : process.env.FIREBASE_SERVICE_ACCOUNT;

        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(parsed),
          projectId: parsed.project_id || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hoomzo'
        });
        console.log('✓ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable');
        return firebaseAdmin;
      } catch (err) {
        console.warn('⚠️ Failed to initialize from FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
      }
    }

    // Option 2: Load from individual environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        // Fix escaped newlines in environment variables (common in Render, Heroku, etc.)
        if (typeof privateKey === 'string') {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }

        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hoomzo';

        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId
        });
        console.log('✓ Firebase Admin initialized from FIREBASE_PRIVATE_KEY & FIREBASE_CLIENT_EMAIL environment variables');
        return firebaseAdmin;
      } catch (err) {
        console.warn('⚠️ Failed to initialize from FIREBASE_PRIVATE_KEY environment variables:', err.message);
      }
    }

    // Option 3: Load from serviceAccountKey.json file (local development)
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'hoomzo'
      });
      console.log('✓ Firebase Admin initialized from serviceAccountKey.json file');
      return firebaseAdmin;
    }

    console.warn('⚠️ Firebase Admin initialization: No credentials found (FIREBASE_SERVICE_ACCOUNT, FIREBASE_PRIVATE_KEY/CLIENT_EMAIL, or serviceAccountKey.json)');
    return null;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    return null;
  }
};

// Get Firebase Admin instance
export const getFirebaseAdmin = () => {
  if (!firebaseAdmin || admin.apps.length === 0) {
    return initializeFirebase();
  }
  return firebaseAdmin;
};

export { admin };
