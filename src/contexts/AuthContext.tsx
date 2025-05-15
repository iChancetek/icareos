
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
  user: { email?: string; displayName?: string; photoURL?: string; } | null;
  updateUserDisplayName: (newDisplayName: string) => Promise<boolean>;
  updateUserPhotoURL: (newPhotoDataUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'medisummarize_auth_token';
const MOCK_USER_EMAIL_KEY = 'medisummarize_mock_user_email';
const MOCK_USER_PASSWORD_KEY_PREFIX = 'medisummarize_mock_user_password_';
const MOCK_USER_DISPLAY_NAME_KEY_PREFIX = 'medisummarize_mock_user_display_name_';
const MOCK_USER_PHOTO_URL_KEY_PREFIX = 'medisummarize_mock_user_photo_url_';


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; displayName?: string; photoURL?: string; } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const activeUserEmail = localStorage.getItem(MOCK_USER_EMAIL_KEY);

    if (token && activeUserEmail) {
      const displayName = localStorage.getItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${activeUserEmail}`) || 'User';
      const photoURL = localStorage.getItem(`${MOCK_USER_PHOTO_URL_KEY_PREFIX}${activeUserEmail}`) || undefined;
      setIsAuthenticated(true);
      setUser({ email: activeUserEmail, displayName, photoURL });
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
    
    if (localStorage.getItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`) === null) {
        setIsLoading(false);
        return false; 
    }

    if (storedPassword === passwordIn) {
      const mockToken = `mock_token_${Date.now()}`;
      localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
      localStorage.setItem(MOCK_USER_EMAIL_KEY, emailIn); 
      
      const displayName = localStorage.getItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${emailIn}`) || 'Dr. Demo';
      const photoURL = localStorage.getItem(`${MOCK_USER_PHOTO_URL_KEY_PREFIX}${emailIn}`) || undefined;
      
      setIsAuthenticated(true);
      setUser({ email: emailIn, displayName, photoURL });
      
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

    if (localStorage.getItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`)) {
      setIsLoading(false);
      return false; 
    }

    localStorage.setItem(`${MOCK_USER_PASSWORD_KEY_PREFIX}${emailIn}`, passwordIn);
    localStorage.setItem(`${MOCK_USER_DISPLAY_NAME_KEY_PREFIX}${emailIn}`, displayNameIn);
    // No default photoURL on signup for this demo

    const mockToken = `mock_token_${Date.now()}`;
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(MOCK_USER_EMAIL_KEY, emailIn); 
    
    setIsAuthenticated(true);
    setUser({ email: emailIn, displayName: displayNameIn, photoURL: undefined });

    console.log(`[AuthContext Placeholder] User signed up: ${emailIn}. Would sync to HubSpot here.`);
    await trackLoginEventInHubSpot(emailIn);

    router.push('/dashboard/consultations');
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(MOCK_USER_EMAIL_KEY); 
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

  const updateUserPhotoURL = async (newPhotoDataUrl: string): Promise<boolean> => {
    if (user && user.email) {
      setUser(currentUser => currentUser ? { ...currentUser, photoURL: newPhotoDataUrl } : null);
      localStorage.setItem(`${MOCK_USER_PHOTO_URL_KEY_PREFIX}${user.email}`, newPhotoDataUrl);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, signup, logout, user, updateUserDisplayName, updateUserPhotoURL }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
