
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
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
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, runTransaction, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Consultation } from '@/types';

// Define our custom User type based on the project brief
export interface User {
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
  // Consultation methods
  saveConsultation: (consultationData: Omit<Consultation, 'id' | 'userId'>) => Promise<string | null>;
  getUserConsultations: () => Promise<Consultation[]>;
  getConsultationById: (id: string) => Promise<Consultation | null>;
  updateConsultation: (id: string, updates: Partial<Consultation>) => Promise<boolean>;
  deleteConsultation: (id: string) => Promise<boolean>;
  // Admin methods
  getAllUsers: () => Promise<User[]>;
  getAllConsultations: () => Promise<Consultation[]>;
}

interface NewUserInfo {
  displayName: string;
  username: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newUserInfo, setNewUserInfo] = useState<NewUserInfo | null>(null); // Temp store for signup info
  const router = useRouter();
  const pathname = usePathname();

  const createUserProfile = async (fbUser: FirebaseUser, displayName: string, username: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    try {
      const newUserProfileData = await runTransaction(db, async (transaction) => {
        // Check if username is unique
        const usernameQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
          // This check is not perfect because of transaction isolation, but it's a good first pass.
          // A more robust solution might use a separate collection for usernames or a Cloud Function trigger.
          throw new Error(`Username "${username}" is already taken.`);
        }

        const userDoc = await transaction.get(userDocRef);
        if (userDoc.exists()) {
          console.warn("User document already exists for new user:", fbUser.uid);
          const existingData = userDoc.data();
          transaction.update(userDocRef, { lastLogin: serverTimestamp() });
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
      // If user creation fails, we should sign out the partially created Firebase auth user
      await signOut(auth);
      throw error; // Rethrow to be caught by the signup function
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          const userDocRef = doc(db, 'users', fbUser.uid);
          let userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            console.log("New user detected, creating profile...");
            const profileData = newUserInfo || { 
              displayName: fbUser.displayName || "New User", 
              username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0,5)}` 
            };
            const userProfile = await createUserProfile(fbUser, profileData.displayName, profileData.username);
            if (userProfile) {
              setUser(userProfile);
            }
            setNewUserInfo(null);
          } else {
            // Update last login timestamp
            if (pathname !== '/dashboard/admin') { // Avoid excessive writes for admins just browsing
                await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            }
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
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error during auth state change processing:", error);
        setUser(null);
        setFirebaseUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [newUserInfo, pathname]);

  const isAuthenticated = !isLoading && !!user;

  useEffect(() => {
    const publicRoutes = ['/login', '/signup', '/'];
    const isPublicRoute = publicRoutes.includes(pathname);
    const isAdminRoute = pathname.startsWith('/dashboard/admin');

    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.push('/login');
      }
      if (isAuthenticated && isPublicRoute) {
        router.push('/dashboard/consultations');
      }
       if (isAuthenticated && isAdminRoute && user?.role !== 'admin') {
        router.push('/dashboard/consultations');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  const login = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailIn, passwordIn);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error: any) {
      // This is the common error for wrong password or user not found.
      if (error.code === 'auth/invalid-credential') {
        console.warn("Firebase Login Warning:", "Invalid credentials provided by user.");
      } else {
        // Log other, more critical errors as errors.
        console.error("Firebase Login Error Code:", error.code, "Message:", error.message);
      }
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (emailIn: string, passwordIn: string, displayNameIn: string, usernameIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      setNewUserInfo({ displayName: displayNameIn, username: usernameIn });
      await createUserWithEmailAndPassword(auth, emailIn, passwordIn);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error: any) {
      setNewUserInfo(null); 
      console.error("Firebase Signup Error Code:", error.code, "Message:", error.message);
      setIsLoading(false);
      throw error; // Let the caller handle the error message
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      setNewUserInfo(null); 
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error: any) {
      console.error("Google Sign-In Error Code:", error.code, "Message:", error.message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
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
      return false;
    }
  };

  // Consultation Methods
  const saveConsultation = async (consultationData: Omit<Consultation, 'id' | 'userId'>): Promise<string | null> => {
    if (!user) return null;
    try {
        const newConsultationRef = doc(collection(db, 'consultations'));
        const newConsultation: Consultation = {
            id: newConsultationRef.id,
            userId: user.uid,
            ...consultationData,
        };
        await setDoc(newConsultationRef, newConsultation);
        return newConsultationRef.id;
    } catch (error) {
        console.error("Error saving consultation:", error);
        return null;
    }
  };

  const getUserConsultations = useCallback(async (): Promise<Consultation[]> => {
    if (!user) return [];
    try {
        const q = query(collection(db, 'consultations'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const consultations = querySnapshot.docs.map(doc => doc.data() as Consultation);
        consultations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return consultations;
    } catch (error) {
        console.error("Error fetching user consultations:", error);
        return [];
    }
  }, [user]);

  const getConsultationById = useCallback(async (id: string): Promise<Consultation | null> => {
    if (!user) return null;
    try {
        const docRef = doc(db, 'consultations', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().userId === user.uid) {
            return docSnap.data() as Consultation;
        }
        return null;
    } catch (error) {
        console.error("Error fetching consultation by ID:", error);
        return null;
    }
  }, [user]);

  const updateConsultation = async (id: string, updates: Partial<Consultation>): Promise<boolean> => {
    if (!user) return false;
    try {
        const docRef = doc(db, 'consultations', id);
        // Security check: ensure user owns this doc before updating.
        const docSnap = await getDoc(docRef);
        if(docSnap.exists() && docSnap.data().userId === user.uid) {
            await updateDoc(docRef, updates);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error updating consultation:", error);
        return false;
    }
  };

  const deleteConsultation = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
        const docRef = doc(db, 'consultations', id);
        // Security check: ensure user owns this doc before deleting.
         const docSnap = await getDoc(docRef);
        if(docSnap.exists() && docSnap.data().userId === user.uid) {
            await docRef.delete();
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error deleting consultation:", error);
        return false;
    }
  };
  
  // Admin Methods
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (user?.role !== 'admin') return [];
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate() || null,
                lastLogin: data.lastLogin?.toDate() || null,
            } as User;
        });
    } catch (error) {
        console.error("Error getting all users:", error);
        return [];
    }
  }, [user]);

  const getAllConsultations = useCallback(async (): Promise<Consultation[]> => {
    if (user?.role !== 'admin') return [];
    try {
        const querySnapshot = await getDocs(collection(db, "consultations"));
        const consultations = querySnapshot.docs.map(doc => doc.data() as Consultation);
        consultations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return consultations;
    } catch (error) {
        console.error("Error getting all consultations:", error);
        return [];
    }
  }, [user]);


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
      updateUserProfile,
      saveConsultation,
      getUserConsultations,
      getConsultationById,
      updateConsultation,
      deleteConsultation,
      getAllUsers,
      getAllConsultations,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
