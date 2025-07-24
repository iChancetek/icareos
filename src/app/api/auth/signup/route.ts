
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase'; // Assuming admin-sdk is not set up, use client for demo
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// IMPORTANT: For a production app, this endpoint should be protected (e.g., check for a valid Firebase ID token)
// and ideally use the Firebase Admin SDK on a secure backend to create user profiles.
// This implementation uses the client SDK for simplicity in this environment.

export async function POST(request: Request) {
  try {
    const { uid, email, displayName, username } = await request.json();

    if (!uid || !email || !displayName || !username) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const userDocRef = doc(db, 'users', uid);
    
    const newUserProfile = {
      uid: uid,
      email: email,
      username: username,
      displayName: displayName, // fullName
      photoURL: null, // profilePictureURL - starts as null
      role: 'user', // Default role
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    await setDoc(userDocRef, newUserProfile);

    console.log(`[API Signup] Successfully created Firestore profile for UID: ${uid}`);
    return NextResponse.json({ message: 'User profile created successfully', uid: uid }, { status: 201 });

  } catch (error: any) {
    console.error('[API Signup] Error creating user profile:', error);
    // Log the detailed error on the server, but return a generic message to the client.
    return NextResponse.json({ message: 'An error occurred while creating the user profile.', error: error.message || 'Unknown error' }, { status: 500 });
  }
}
