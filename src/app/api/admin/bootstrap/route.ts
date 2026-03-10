import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/bootstrap
 *
 * Grants admin role to a user by UID using the Firestore REST API.
 * Avoids the client-side Firebase SDK which cannot connect from server context.
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

        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

        if (!projectId || !apiKey) {
            return NextResponse.json({ error: 'Firebase configuration missing.' }, { status: 500 });
        }

        // Use Firestore REST API to patch the user document's role field
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=role&key=${apiKey}`;

        const firestoreRes = await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    role: { stringValue: 'admin' },
                },
            }),
        });

        if (!firestoreRes.ok) {
            const errBody = await firestoreRes.text();
            console.error('[Bootstrap API] Firestore REST error:', errBody);
            return NextResponse.json(
                { error: `Firestore update failed: ${firestoreRes.status}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: `User ${uid} is now an admin.` });
    } catch (error: any) {
        console.error('[Bootstrap API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
