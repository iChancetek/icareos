
import { NextResponse } from 'next/server';
import { db } from '@/lib/inMemoryUserStore'; // Simulated DB

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log(`[API Login] Attempting login for email: ${email}`);

    if (!email || !password) {
      console.log('[API Login] Email or password missing in request.');
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.findUser(email);

    if (!user) {
      console.log(`[API Login] User not found in store: ${email}`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
    console.log(`[API Login] User found in store: ${user.email}`);

    // In a real app: Compare hashed password
    // const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    const isPasswordValid = user.passwordHash === password; // Plaintext comparison for demo ONLY.

    if (!isPasswordValid) {
      console.log(`[API Login] Password mismatch for user: ${email}`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
    console.log(`[API Login] Password matched for user: ${email}. Login successful.`);

    // Return a subset of user info, not the passwordHash
    const { passwordHash, ...userToReturn } = user;
    return NextResponse.json({ message: 'Login successful', user: userToReturn, token: `mock-jwt-token-for-${email}` }, { status: 200 });

  } catch (error) {
    console.error('[API Login] Error:', error);
    return NextResponse.json({ message: 'An error occurred during login' }, { status: 500 });
  }
}
