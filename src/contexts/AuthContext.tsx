
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trackLoginEventInHubSpot } from '@/services/hubspotService'; // Import the new function

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailIn: string, passwordIn: string) => Promise<boolean>;
  signup: (emailIn: string, passwordIn: string, displayNameIn?: string) => Promise<boolean>;
  logout: () => void;
  user: { email?: string; displayName?: string } | null;
  updateUserDisplayName: (newDisplayName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'medisummarize_auth_token';
const MOCK_USER_EMAIL_KEY = 'medisummarize_mock_user_email'; // Used to track the "active" mock user for demo
const MOCK_USER_PASSWORD_KEY_PREFIX = 'medisummarize_mock_user_password_'; // Stores password per email
const MOCK_USER_DISPLAY_NAME_KEY_PREFIX = 'medisummarize_mock_user_display_name_'; // Stores display name per email


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; displayName?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const activeUserEmail = localStorage.getItem(MOCK_USER_EMAIL_KEY); // Get current "logged in" user email

    if (token && activeUserEmail) {
      const displayName = localStorage.getItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${activeUserEmail}`) || 'User';
      setIsAuthenticated(true);
      setUser({ email: activeUserEmail, displayName });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/signup'].includes(pathname)) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && ['/login', '/signup'].includes(pathname)) {
      router.push('/dashboard/consultations');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const storedPassword = localStorage.getItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`);
    
    // Check if user exists (by checking if password is set for that email)
    if (localStorage.getItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`) === null) {
        setIsLoading(false);
        return false; // User does not exist
    }


    if (storedPassword === passwordIn) {
      const mockToken = `mock_token_${Date.now()}`;
      localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
      localStorage.setItem(MOCK_USER_EMAIL_KEY, emailIn); // Set this email as the "active" logged-in user
      
      const displayName = localStorage.getItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${emailIn}`) || 'Dr. Demo';
      
      setIsAuthenticated(true);
      setUser({ email: emailIn, displayName });
      
      await trackLoginEventInHubSpot(emailIn);
      
      router.push('/dashboard/consultations');
      setIsLoading(false);
      return true;
    } else {
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (emailIn: string, passwordIn: string, displayNameIn: string = 'New User'): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo, check if email "exists" by seeing if password is set.
    // In a real app, this check is against a DB and more robust.
    if (localStorage.getItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`)) {
      setIsLoading(false);
      // console.log("User already exists placeholder"); // Replace with toast if desired
      return false; // User "already exists" for demo
    }

    localStorage.setItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`, passwordIn);
    localStorage.setItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${emailIn}`, displayNameIn);

    const mockToken = `mock_token_${Date.now()}`;
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(MOCK_USER_EMAIL_KEY, emailIn); // Set as active user
    
    setIsAuthenticated(true);
    setUser({ email: emailIn, displayName: displayNameIn });

    console.log(`[AuthContext Placeholder] User signed up: ${emailIn}. Would sync to HubSpot here.`);
    await trackLoginEventInHubSpot(emailIn);

    router.push('/dashboard/consultations');
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(MOCK_USER_EMAIL_KEY); // Clear the active user email
    // Passwords and display names per email remain in localStorage for demo persistence
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  const updateUserDisplayName = async (newDisplayName: string): Promise<boolean> => {
    if (user && user.email) {
      setUser(currentUser => currentUser ? { ...currentUser, displayName: newDisplayName } : null);
      localStorage.setItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${user.email}`, newDisplayName);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, signup, logout, user, updateUserDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
