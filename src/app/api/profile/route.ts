
import { NextResponse } from 'next/server';
import { db } from '@/lib/inMemoryUserStore'; // Simulated DB

// In a real app, GET and PUT would require authentication (e.g., checking a JWT token)
// to identify the user and ensure they are authorized.
// For this demo, we'll rely on the email sent in the request, which is NOT secure.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ message: 'Email query parameter is required' }, { status: 400 });
    }

    const user = await db.findUser(email);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    const { passwordHash, ...userToReturn } = user;
    return NextResponse.json({ user: userToReturn }, { status: 200 });

  } catch (error) {
    console.error('[API GET Profile] Error:', error);
    return NextResponse.json({ message: 'An error occurred while fetching profile' }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  try {
    const { email, displayName, photoURL } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required in the request body' }, { status: 400 });
    }
    if (displayName === undefined && photoURL === undefined) {
        return NextResponse.json({ message: 'Either displayName or photoURL must be provided for update' }, { status: 400 });
    }

    const updates: Partial<{ displayName: string; photoURL?: string }> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;


    const updatedUser = await db.updateUserProfile(email, updates);

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found or update failed' }, { status: 404 });
    }

    const { passwordHash, ...userToReturn } = updatedUser;
    return NextResponse.json({ message: 'Profile updated successfully', user: userToReturn }, { status: 200 });

  } catch (error) {
    console.error('[API PUT Profile] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while updating profile';
    return NextResponse.json({ message }, { status: 500 });
  }
}
