
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trackLoginEventInHubSpot } from '@/services/hubspotService';

interface User {
  email: string;
  displayName: string;
  photoURL?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailIn: string, passwordIn: string) => Promise<boolean>;
  signup: (emailIn: string, passwordIn: string, displayNameIn: string) => Promise<boolean>;
  logout: () => void;
  user: User | null;
  updateUserDisplayName: (newDisplayName: string) => Promise<boolean>;
  updateUserPhotoURL: (newPhotoDataUrl: string) => Promise<boolean>;
  fetchUserProfile: () => Promise<void>; // Added to explicitly fetch profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'medisummarize_auth_token';
const USER_EMAIL_KEY = 'medisummarize_user_email'; // Stores email of logged-in user

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = async (email?: string) => {
    const userEmail = email || localStorage.getItem(USER_EMAIL_KEY);
    if (!userEmail) {
      console.log("No user email found for fetching profile.");
      logout(); // If no email, treat as logged out.
      return;
    }
    try {
      console.log("AuthContext: Attempting to fetch user profile for", userEmail);
      const response = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          console.log("AuthContext: Profile fetched and set:", data.user);
        } else {
           console.error("AuthContext: Profile fetch response OK, but no user data.", data);
           logout(); // If no user data, logout
        }
      } else {
        console.error("AuthContext: Failed to fetch profile, status:", response.status, await response.text());
        logout(); // If profile fetch fails, logout
      }
    } catch (error) {
      console.error("AuthContext: Error fetching profile:", error);
      logout(); // If error, logout
    }
  };
  
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUserEmail = localStorage.getItem(USER_EMAIL_KEY);

    if (token && storedUserEmail) {
      console.log("AuthContext: Token and email found. Fetching profile...");
      fetchUserProfile(storedUserEmail).finally(() => setIsLoading(false));
    } else {
      console.log("AuthContext: No token or email found. Setting loading to false.");
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/signup'].includes(pathname)) {
      router.push('/login');
    }
    // No redirect from login/signup if already authenticated, let the page components handle it
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailIn, password: passwordIn }),
      });
      const data = await response.json();
      if (response.ok && data.token && data.user) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(USER_EMAIL_KEY, data.user.email); // Store email
        setUser(data.user);
        setIsAuthenticated(true);
        await trackLoginEventInHubSpot(data.user.email);
        router.push('/dashboard/consultations');
        return true;
      } else {
        console.error("Login failed:", data.message);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (emailIn: string, passwordIn: string, displayNameIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailIn, password: passwordIn, displayName: displayNameIn }),
      });
      const data = await response.json();
      if (response.ok && data.token && data.user) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(USER_EMAIL_KEY, data.user.email); // Store email
        setUser(data.user);
        setIsAuthenticated(true);
        await trackLoginEventInHubSpot(data.user.email); // Or a signup event
        router.push('/dashboard/consultations');
        return true;
      } else {
         console.error("Signup failed:", data.message);
        return false;
      }
    } catch (error) {
       console.error("Signup error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false); // Ensure loading is false on logout
    router.push('/login');
  };

  const updateUserProfileAPI = async (updates: Partial<User>): Promise<boolean> => {
    if (!user || !user.email) return false;
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // In a real app, include auth token in headers: 'Authorization': `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}`
        body: JSON.stringify({ email: user.email, ...updates }),
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        return true;
      }
      console.error("Update profile failed:", data.message);
      return false;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserDisplayName = (newDisplayName: string) => {
    return updateUserProfileAPI({ displayName: newDisplayName });
  };

  const updateUserPhotoURL = (newPhotoDataUrl: string) => {
    return updateUserProfileAPI({ photoURL: newPhotoDataUrl });
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, signup, logout, user, updateUserDisplayName, updateUserPhotoURL, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
