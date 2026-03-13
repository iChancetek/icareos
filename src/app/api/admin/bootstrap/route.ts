import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function getAdminApp() {
    if (getApps().length > 0) return getApps()[0];

    let credential;

    // 1. Preferred: Service Account JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    }
    // 2. Fallback: Individual variables (standard for Firebase App Hosting)
    else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) {
        credential = cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        });
    }

    return initializeApp({ credential });
}

/**
 * POST /api/admin/bootstrap
 * Grants admin role to a user using Firebase Admin SDK
 */
export async function POST(req: NextRequest) {
    try {
        getAdminApp();
        const db = getFirestore();
        const { uid, secret } = await req.json();

        const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
        if (!bootstrapSecret || secret !== bootstrapSecret) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }

        if (!uid) {
            return NextResponse.json({ error: 'uid is required.' }, { status: 400 });
        }

        const userDocRef = db.collection('users').doc(uid);
        const snap = await userDocRef.get();

        if (snap.exists) {
            await userDocRef.update({ role: 'admin' });
        } else {
            return NextResponse.json({ error: `User document for ${uid} not found. Please log in normally first.` }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: `User ${uid} successfully granted admin role.` });
    } catch (error: any) {
        console.error('[Bootstrap API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
