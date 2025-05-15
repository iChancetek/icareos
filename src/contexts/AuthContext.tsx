
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailIn: string, passwordIn: string) => Promise<boolean>;
  signup: (emailIn: string, passwordIn: string) => Promise<boolean>;
  logout: () => void;
  user: { email?: string; displayName?: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'medisummarize_auth_token';
const MOCK_USER_EMAIL_KEY = 'medisummarize_mock_user_email';
const MOCK_USER_PASSWORD_KEY = 'medisummarize_mock_user_password'; // INSECURE: For demo only

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; displayName?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedEmail = localStorage.getItem(MOCK_USER_EMAIL_KEY);
    if (token && storedEmail) {
      setIsAuthenticated(true);
      setUser({ email: storedEmail, displayName: 'Dr. Demo' }); 
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
    // Simulate API call / check
    await new Promise(resolve => setTimeout(resolve, 500));

    const storedEmail = localStorage.getItem(MOCK_USER_EMAIL_KEY);
    const storedPassword = localStorage.getItem(MOCK_USER_PASSWORD_KEY);

    if (storedEmail === emailIn && storedPassword === passwordIn) {
      const mockToken = `mock_token_${Date.now()}`;
      localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
      setIsAuthenticated(true);
      setUser({ email: emailIn, displayName: 'Dr. Demo' });
      router.push('/dashboard/consultations');
      setIsLoading(false);
      return true;
    } else {
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call / check
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real app, you'd check if the email already exists on the backend.
    // For demo, we just overwrite.
    localStorage.setItem(MOCK_USER_EMAIL_KEY, emailIn);
    localStorage.setItem(MOCK_USER_PASSWORD_KEY, passwordIn); // INSECURE: Storing plain text password

    // Automatically log in after signup
    const mockToken = `mock_token_${Date.now()}`;
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    setIsAuthenticated(true);
    setUser({ email: emailIn, displayName: 'Dr. Demo' });
    router.push('/dashboard/consultations');
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(MOCK_USER_EMAIL_KEY);
    localStorage.removeItem(MOCK_USER_PASSWORD_KEY);
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, signup, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
