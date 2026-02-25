
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
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
console.log("Firebase Init API Key Check (first 5 chars):", firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) : "MISSING", "dummy?", firebaseConfig.apiKey === "dummy-api-key-to-bypass-build-crash");
console.log("Full Firebase Config:", JSON.stringify(firebaseConfig, null, 2));
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let db;
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  db = getFirestore(app);
}

const functions = getFunctions(app);

export { app, auth, db, functions };
