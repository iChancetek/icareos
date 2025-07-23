
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // Correctly import from firebase.ts
import { useToast } from "@/hooks/use-toast";


// Define our custom User type based on the project brief
interface User {
  uid: string;
  email: string | null;
  username: string | null; // Added username
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'therapist' | 'admin';
  createdAt: Date | null;
  lastLogin: Date | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailIn: string, passwordIn: string) => Promise<boolean>;
  signup: (emailIn: string, passwordIn: string, displayNameIn: string, usernameIn: string) => Promise<boolean>; // Added username
  logout: () => void;
  signInWithGoogle: () => Promise<boolean>;
  user: User | null;
  firebaseUser: FirebaseUser | null; // Keep firebase user for some direct operations
  updateUserProfile: (updates: { displayName?: string, photoURL?: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            username: userData.username || fbUser.email?.split('@')[0] || null, // Add username
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            role: userData.role,
            createdAt: userData.createdAt?.toDate(),
            lastLogin: userData.lastLogin?.toDate(),
          });
        } else {
            // This case can happen with social sign-in where user exists in Auth but not Firestore yet.
            const newUsername = fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0, 5)}`;
            const newUserProfile: Omit<User, 'createdAt' | 'lastLogin'> = {
                uid: fbUser.uid,
                email: fbUser.email,
                username: newUsername,
                displayName: fbUser.displayName,
                photoURL: fbUser.photoURL,
                role: 'user', // Default role
            };
             await setDoc(userDocRef, {
                ...newUserProfile,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            }, { merge: true });
            
            setUser({
                ...newUserProfile,
                createdAt: new Date(),
                lastLogin: new Date(),
            });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !isLoading && !!user;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/signup'].includes(pathname)) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      router.push(`/dashboard/consultations`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailIn, passwordIn);
      // Auth state change will handle the rest
      return true;
    } catch (error: any) {
      console.error("Firebase Login Error:", error.message);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (emailIn: string, passwordIn: string, displayNameIn: string, usernameIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailIn, passwordIn);
      const fbUser = userCredential.user;
      
      const newUserProfile: Omit<User, 'createdAt' | 'lastLogin'> = {
        uid: fbUser.uid,
        email: fbUser.email,
        username: usernameIn, // Save username
        displayName: displayNameIn,
        photoURL: fbUser.photoURL,
        role: 'user', // default role
      };

      await setDoc(doc(db, "users", fbUser.uid), {
          ...newUserProfile,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
      });
      // onAuthStateChanged will handle setting the user state.
      return true;
    } catch (error: any) {
      console.error("Firebase Signup Error:", error.message);
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
      setIsLoading(true);
      try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          // onAuthStateChanged will handle the rest (including creating a user doc if it's the first time)
          return true;
      } catch (error: any) {
          console.error("Google Sign-In Error:", error.message);
          toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
          setIsLoading(false);
          return false;
      }
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will clear user state
    router.push('/login');
  };

  const updateUserProfile = async (updates: { displayName?: string, photoURL?: string }): Promise<boolean> => {
      if (!firebaseUser) return false;
      try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userDocRef, updates, { merge: true });
          // Optimistically update local state
          if (user) {
              setUser({...user, ...updates});
          }
          return true;
      } catch (error: any) {
          console.error("Update Profile Error:", error.message);
          toast({ title: "Update Failed", description: "Could not update profile in database.", variant: "destructive" });
          return false;
      }
  };

  return (
    <AuthContext.Provider value={{
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        signInWithGoogle,
        user,
        firebaseUser,
        updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
