
// Import the functions you need from the SDKs you need
import {initializeApp, getApp, getApps} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: 'medisummarize-qk1kp',
  appId: '1:979096704240:web:60ff4f01a2e5c164401e35',
  storageBucket: 'medisummarize-qk1kp.firebasestorage.app',
  apiKey: 'AIzaSyA8GqHDkhj2p-XUyRgJ_QLb3-3i_CoI1uA',
  authDomain: 'medisummarize-qk1kp.firebaseapp.com',
  messagingSenderId: '979096704240',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export {app, auth, db};

    