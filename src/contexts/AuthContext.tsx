
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

// Define our custom User type based on the project brief
interface User {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null; // Corresponds to 'fullName' in the brief
  photoURL: string | null; // Corresponds to 'profileImage'
  role: 'user' | 'therapist' | 'admin';
  createdAt: Date | null;
  lastLogin: Date | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailIn: string, passwordIn: string) => Promise<boolean>;
  signup: (emailIn: string, passwordIn: string, displayNameIn: string, usernameIn: string) => Promise<boolean>;
  logout: () => void;
  signInWithGoogle: () => Promise<boolean>;
  user: User | null;
  firebaseUser: FirebaseUser | null;
  updateUserProfile: (updates: { displayName?: string, photoURL?: string }) => Promise<boolean>;
}

interface NewUserInfo {
  displayName: string;
  username: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Voice Greeting Logic ---
let hasGreeted = false; // Prevent greeting on hot-reloads

const playGreeting = (user: User, firebaseUser: FirebaseUser) => {
  if (typeof window === 'undefined' || !window.speechSynthesis || hasGreeted) {
    return;
  }
  
  const creationTime = new Date(firebaseUser.metadata.creationTime || 0).getTime();
  const lastSignInTime = new Date(firebaseUser.metadata.lastSignInTime || 0).getTime();
  
  const isNewUser = Math.abs(lastSignInTime - creationTime) < 5000;

  const userName = user.displayName?.split(' ')[0] || 'there';
  
  const greetingText = isNewUser
    ? `Hello ${userName}, it’s a pleasure to meet you. Welcome to MediScribe.`
    : `Welcome back, ${userName}. Good to see you again.`;

  try {
    const utterance = new SpeechSynthesisUtterance(greetingText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    
    window.speechSynthesis.cancel(); 
    window.speechSynthesis.speak(utterance);
    
    hasGreeted = true;
  } catch (error) {
    console.error("SpeechSynthesis Error:", error);
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newUserInfo, setNewUserInfo] = useState<NewUserInfo | null>(null); // Temp store for signup info
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const createUserProfile = async (fbUser: FirebaseUser, displayName: string, username: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    try {
      const newUserProfileData: User = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (userDoc.exists()) {
          // This case should ideally not be hit if a new user is signing up,
          // but as a safeguard, we return the existing data.
          console.warn("User document already exists for new user:", fbUser.uid);
          // Just read and return existing data
          const existingData = userDoc.data();
          return {
             ...existingData,
             uid: fbUser.uid,
             createdAt: existingData.createdAt?.toDate() || new Date(),
             lastLogin: new Date(),
          } as User;
        }

        const newUserProfile: Omit<User, 'createdAt' | 'lastLogin'> & {createdAt: any, lastLogin: any} = {
          uid: fbUser.uid,
          email: fbUser.email,
          username: username,
          displayName: displayName,
          photoURL: fbUser.photoURL,
          role: 'user', 
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        transaction.set(userDocRef, newUserProfile);
        
        return {
          ...newUserProfile,
          createdAt: new Date(),
          lastLogin: new Date(),
        };
      });
      return newUserProfileData;
    } catch (error) {
      console.error("Error creating user profile in transaction: ", error);
      toast({ title: "Profile Creation Failed", description: "Could not create your user profile in the database.", variant: "destructive" });
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log("New user detected, creating profile...");
          const profileData = newUserInfo || { 
            displayName: fbUser.displayName || "New User", 
            username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0,5)}` 
          };
          const userProfile = await createUserProfile(fbUser, profileData.displayName, profileData.username);
          if (userProfile) {
            setUser(userProfile);
            playGreeting(userProfile, fbUser);
          }
          setNewUserInfo(null); // Clear temp info
        } else {
          // Existing user, fetch their profile and update last login
          await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
          const userData = userDoc.data();
          const userProfile: User = {
            uid: fbUser.uid,
            email: fbUser.email,
            username: userData.username,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            role: userData.role || 'user',
            createdAt: userData.createdAt?.toDate() || null,
            lastLogin: new Date(),
          };
          setUser(userProfile);
          if (!hasGreeted) { // Only greet returning users if they haven't been greeted this session
            playGreeting(userProfile, fbUser);
          }
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        hasGreeted = false; // Reset greeting state on logout
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [newUserInfo]); // Rerun when newUserInfo is set

  const isAuthenticated = !isLoading && !!user;

  useEffect(() => {
    const publicRoutes = ['/login', '/signup'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.push('/login');
      }
      if (isAuthenticated && isPublicRoute) {
        router.push('/dashboard/consultations');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailIn, passwordIn);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error: any) {
      console.error("Firebase Login Error Code:", error.code, "Message:", error.message);
      toast({ title: "Login Failed", description: "Invalid credentials. Please try again.", variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (emailIn: string, passwordIn: string, displayNameIn: string, usernameIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Temporarily store the additional info
      setNewUserInfo({ displayName: displayNameIn, username: usernameIn });
      // Create user in Firebase Auth, onAuthStateChanged will handle profile creation
      await createUserWithEmailAndPassword(auth, emailIn, passwordIn);
      return true;
    } catch (error: any) {
      setNewUserInfo(null); // Clear temp info on failure
      let errorMessage = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else {
        errorMessage = error.message;
      }
      console.error("Firebase Signup Error Code:", error.code, "Message:", error.message);
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return true;
    } catch (error: any) {
      console.error("Google Sign-In Error Code:", error.code, "Message:", error.message);
      toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const updateUserProfile = async (updates: { displayName?: string, photoURL?: string }): Promise<boolean> => {
    if (!firebaseUser) return false;
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, updates);

      if (user) {
        setUser({ ...user, ...updates });
      }
      return true;
    } catch (error: any) {
      console.error("Update Profile Error:", error.message);
      toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
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
