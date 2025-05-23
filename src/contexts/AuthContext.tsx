
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
  signup: (emailIn: string, passwordIn: string, displayNameIn: string) => Promise<boolean>; // Added displayNameIn
  logout: () => void;
  user: User | null;
  updateUserDisplayName: (newDisplayName: string) => Promise<boolean>;
  updateUserPhotoURL: (newPhotoDataUrl: string) => Promise<boolean>;
  fetchUserProfile: (email?: string) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'medisummarize_auth_token';
const USER_EMAIL_KEY = 'medisummarize_user_email'; 

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = async (email?: string) => {
    const userEmail = email || localStorage.getItem(USER_EMAIL_KEY);
    if (!userEmail) {
      console.log("AuthContext: No user email found for fetching profile.");
      setIsLoading(false); 
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
           logout(); 
        }
      } else {
        if (response.status === 404) {
          console.warn(`AuthContext: User profile not found (status 404) for email ${userEmail}. This can happen if the server restarted and the in-memory user store was cleared. Logging out.`);
        } else {
          console.error("AuthContext: Failed to fetch profile, status:", response.status);
        }
        
        try {
            const errorData = await response.json();
            // Log the specific message from the API if available, e.g., { message: 'User not found' }
            if (response.status === 404) {
                 console.warn("AuthContext: Profile fetch API error data:", errorData.message || errorData);
            } else {
                 console.error("AuthContext: Profile fetch API error data:", errorData.message || errorData);
            }
        } catch (e) {
            if (response.status !== 404) { // Avoid double logging for 404 if parsing fails
                console.error("AuthContext: Could not parse error response from profile fetch.");
            }
        }
        logout(); 
      }
    } catch (error) {
      console.error("AuthContext: Error during fetchUserProfile network request or other unexpected issue:", error);
      logout(); 
    }
  };
  
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUserEmail = localStorage.getItem(USER_EMAIL_KEY);

    if (token && storedUserEmail) {
      console.log("AuthContext: Token and email found. Fetching profile for initial load...");
      setIsLoading(true); 
      fetchUserProfile(storedUserEmail).finally(() => setIsLoading(false));
    } else {
      console.log("AuthContext: No token or email found on initial load. Setting loading to false.");
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/signup'].includes(pathname)) {
      router.push('/login');
    }
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
        localStorage.setItem(USER_EMAIL_KEY, data.user.email); 
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
        localStorage.setItem(USER_EMAIL_KEY, data.user.email); 
        setUser(data.user); 
        setIsAuthenticated(true);
        await trackLoginEventInHubSpot(data.user.email); 
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
    console.log("AuthContext: Logging out user.");
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false); 
    router.push('/login');
  };

  const updateUserProfileAPI = async (updates: Partial<User>): Promise<boolean> => {
    if (!user || !user.email) return false;
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
