
import { NextResponse } from 'next/server';
import { db } from '@/lib/inMemoryUserStore'; // Simulated DB

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.findUser(email);

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // In a real app: Compare hashed password
    // const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    const isPasswordValid = user.passwordHash === password; // Plaintext comparison for demo ONLY.

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Return a subset of user info, not the passwordHash
    const { passwordHash, ...userToReturn } = user;
    return NextResponse.json({ message: 'Login successful', user: userToReturn, token: `mock-jwt-token-for-${email}` }, { status: 200 });

  } catch (error) {
    console.error('[API Login] Error:', error);
    return NextResponse.json({ message: 'An error occurred during login' }, { status: 500 });
  }
}
