
// This is a VERY simple in-memory store for demonstration purposes.
// Data will be LOST when the server restarts.
// DO NOT USE THIS IN PRODUCTION.
interface UserProfile {
  email: string;
  passwordHash: string; // In a real app, this MUST be securely hashed.
  displayName: string;
  photoURL?: string;
}

const userStore: Record<string, UserProfile> = {
  // Example user for testing, if needed for initial state (generally, start empty)
  // "test@example.com": {
  //   email: "test@example.com",
  //   passwordHash: "password123", // Plaintext for demo only
  //   displayName: "Dr. Test",
  //   photoURL: ""
  // }
};

export const db = {
  async findUser(email: string): Promise<UserProfile | null> {
    return userStore[email] || null;
  },
  async createUser(profile: UserProfile): Promise<UserProfile> {
    if (userStore[profile.email]) {
      throw new Error('User already exists');
    }
    userStore[profile.email] = profile;
    return profile;
  },
  async updateUserProfile(email: string, updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL'>>): Promise<UserProfile | null> {
    if (!userStore[email]) {
      return null;
    }
    userStore[email] = { ...userStore[email], ...updates };
    return userStore[email];
  },
};
