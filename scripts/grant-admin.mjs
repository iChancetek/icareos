/**
 * One-time admin role grant script.
 * Run with: node scripts/grant-admin.mjs icareos@ichancetek.com
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase Admin SDK to be configured.
 * Uses the Firebase Admin SDK via the firebase-admin package.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error('Usage: node scripts/grant-admin.mjs <email>');
    process.exit(1);
}

// Initialize Admin SDK from env
if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const adminAuth = getAuth();

async function grantAdmin(email) {
    console.log(`Looking up user: ${email}`);

    // Lookup Firebase Auth UID by email
    let fbUser;
    try {
        fbUser = await adminAuth.getUserByEmail(email);
    } catch (err) {
        console.error(`User not found in Firebase Auth: ${err.message}`);
        process.exit(1);
    }

    console.log(`Found Firebase Auth user: ${fbUser.uid}`);

    // Update Firestore users/{uid}.role = 'admin'
    const userDocRef = db.collection('users').doc(fbUser.uid);
    const snap = await userDocRef.get();

    if (!snap.exists) {
        console.error(`No Firestore document found for uid ${fbUser.uid}. Has this user logged in before?`);
        process.exit(1);
    }

    await userDocRef.update({ role: 'admin' });

    console.log(`✅ Successfully granted admin role to ${email} (uid: ${fbUser.uid})`);
    console.log('The user should log out and log back in for the change to take effect.');
}

grantAdmin(targetEmail).catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
