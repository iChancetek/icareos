import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const auth = getAuth();

async function checkUser() {
    try {
        const email = 'chancellor@ichancetek.com';
        const fbUser = await auth.getUserByEmail(email);
        console.log(`Auth UID: ${fbUser.uid}`);

        const doc = await db.collection('users').doc(fbUser.uid).get();
        if (doc.exists) {
            console.log('Firestore Data:', doc.data());
        } else {
            console.log('No Firestore doc found for this UID.');
        }
    } catch (e) {
        console.error(e);
    }
}

checkUser();
