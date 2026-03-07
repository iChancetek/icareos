import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * POST /api/admin/bootstrap
 *
 * One-time endpoint to grant admin role to a specific user by UID.
 * Protected by a BOOTSTRAP_SECRET env variable so it cannot be abused.
 *
 * Body: { uid: string, secret: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { uid, secret } = await req.json();

        const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
        if (!bootstrapSecret || secret !== bootstrapSecret) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }

        if (!uid) {
            return NextResponse.json({ error: 'uid is required.' }, { status: 400 });
        }

        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
            await updateDoc(userDocRef, { role: 'admin' });
        } else {
            // Create minimal profile if user hasn't logged in yet
            await setDoc(userDocRef, {
                uid,
                role: 'admin',
                accountStatus: 'active',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            });
        }

        return NextResponse.json({ success: true, message: `User ${uid} is now an admin.` });
    } catch (error: any) {
        console.error('[Bootstrap API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
