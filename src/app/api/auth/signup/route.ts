
import { NextResponse } from 'next/server';
import { db } from '@/lib/inMemoryUserStore'; // Simulated DB

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ message: 'Display name is required' }, { status: 400 });
    }

    const existingUser = await db.findUser(email);
    if (existingUser) {
      console.log(`[API Signup] Attempt to create existing user: ${email}`);
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    // In a real app: HASH the password securely before storing
    // const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({
      email,
      passwordHash: password, // Storing plaintext for demo ONLY. NEVER DO THIS IN PRODUCTION.
      displayName,
      // photoURL can be added later or set to a default
    });

    console.log(`[API Signup] User created successfully: ${newUser.email}, Name: ${newUser.displayName}`);

    // Return a subset of user info, not the passwordHash
    const { passwordHash, ...userToReturn } = newUser;
    return NextResponse.json({ message: 'User registered successfully', user: userToReturn, token: `mock-jwt-token-for-${email}` }, { status: 201 });

  } catch (error) {
    console.error('[API Signup] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred during registration';
    // Adjust status code if it's a known error like 'User already exists' from createUser
    if (message === 'User already exists') {
        return NextResponse.json({ message }, { status: 409 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
