
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
let firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Fallback to FIREBASE_WEBAPP_CONFIG provided by Firebase App Hosting internally
if (!firebaseConfig.apiKey && typeof process !== 'undefined' && process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    const appHostingConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    firebaseConfig = { ...firebaseConfig, ...appHostingConfig };
  } catch (e) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
  }
}

// Dummy config to prevent Next.js static prerendering crash
if (!firebaseConfig.apiKey) {
  console.warn("Firebase config is missing, using dummy config to prevent build crash.");
  firebaseConfig = {
    apiKey: "dummy-api-key-to-bypass-build-crash",
    authDomain: "dummy.firebaseapp.com",
    projectId: "dummy-project",
    storageBucket: "dummy.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
    measurementId: "G-0000000000"
  };
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let db: Firestore;
try {
  // Only apply long polling on the client-side in production to prevent SSR hanging
  if (typeof window !== 'undefined') {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }) as Firestore;
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  // Fallback if initializeFirestore is called twice somehow
  db = getFirestore(app);
}

const functions = getFunctions(app);

export { app, auth, db, functions };
