
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
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, runTransaction, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db, functions } from '@/lib/firebase';
import type { Consultation } from '@/types';
import { httpsCallable } from 'firebase/functions';

// Define our custom User type based on the project brief
export interface User {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null; // Corresponds to 'fullName' in the brief
  photoURL: string | null; // Corresponds to 'profileImage'
  role: 'user' | 'therapist' | 'admin';
  accountStatus: 'active' | 'disabled';
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
  updateUserByAdmin: (uid: string, updates: { role?: User['role'], accountStatus?: User['accountStatus'] }) => Promise<boolean>;
  deleteUserByAdmin: (uid: string) => Promise<{ success: boolean; message: string }>;
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
          accountStatus: 'active',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        transaction.set(userDocRef, newUserProfile);
        
        // This is the important part: return the complete user profile immediately
        return {
          ...newUserProfile,
          createdAt: new Date(),
          lastLogin: new Date(),
        };
      });
      return newUserProfileData;
    } catch (error) {
      console.error("Error creating user profile in transaction: ", error);
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
            // For Google Sign-In, use their provided name. For email/pass, use our temp state.
            const profileData = newUserInfo || { 
              displayName: fbUser.displayName || "New User", 
              username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0,5)}` 
            };
            const userProfile = await createUserProfile(fbUser, profileData.displayName, profileData.username);
            setUser(userProfile); // Set the full user profile immediately
            setNewUserInfo(null); // Clear temp info
          } else {
            const userData = userDoc.data();
            if (userData.accountStatus === 'disabled') {
                console.warn(`Login attempt by disabled user: ${fbUser.email}`);
                await signOut(auth);
                // Optionally add a toast message here to inform the user
                throw new Error("User account is disabled.");
            }
            if (pathname !== '/dashboard/admin') { 
                await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            }
            const userProfile: User = {
              uid: fbUser.uid,
              email: fbUser.email,
              username: userData.username,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              role: userData.role || 'user',
              accountStatus: userData.accountStatus || 'active',
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
      if (error.code === 'auth/invalid-credential') {
        console.warn("Firebase Login Warning:", "Invalid credentials provided by user.");
      } else {
        console.error("Firebase Login Error Code:", error.code, "Message:", error.message);
      }
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (emailIn: string, passwordIn: string, displayNameIn: string, usernameIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Store user info before creating account, so onAuthStateChanged can use it.
      setNewUserInfo({ displayName: displayNameIn, username: usernameIn });
      await createUserWithEmailAndPassword(auth, emailIn, passwordIn);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error: any) {
        setNewUserInfo(null); // Clear temp info on failure
        setIsLoading(false);
        throw error; // Let the caller handle the error message to display a toast
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
        // Admin can view any consultation, regular user can only view their own
        if (docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
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
        const docSnap = await getDoc(docRef);
        // Admin or owner can update
        if(docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
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
        const docSnap = await getDoc(docRef);
        // Admin or owner can delete
        if(docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
            await deleteDoc(docRef);
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
                uid: doc.id,
                createdAt: data.createdAt?.toDate() || null,
                lastLogin: data.lastLogin?.toDate() || null,
            } as User;
        });
    } catch (error) {
        console.error("Error getting all users:", error);
        return [];
    }
  }, [user]);

  const updateUserByAdmin = async (uid: string, updates: { role?: User['role'], accountStatus?: User['accountStatus'] }): Promise<boolean> => {
    if (user?.role !== 'admin') {
      console.error("Update attempt by non-admin user.");
      return false;
    }
    if (!uid) {
        console.error("No user ID provided for update.");
        return false;
    }
    try {
      const userDocRef = doc(db, 'users', uid);
      // Clean up the updates object to remove any undefined values
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );
      if (Object.keys(cleanedUpdates).length === 0) {
        console.warn("Update skipped: No valid fields to update after cleaning.");
        return true; // No error, but no update was made.
      }
      await updateDoc(userDocRef, cleanedUpdates);
      return true;
    } catch (error) {
      console.error("Error updating user by admin:", error);
      return false;
    }
  };

  const deleteUserByAdmin = async (uid: string): Promise<{ success: boolean; message: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, message: "You are not authorized to perform this action." };
    }
    if (user.uid === uid) {
      return { success: false, message: "Administrators cannot delete their own accounts." };
    }
    try {
      // It's critical that the 'deleteUser' function exists and is deployed in your Firebase project.
      const deleteUserFunction = httpsCallable(functions, 'deleteUser');
      const result = await deleteUserFunction({ uid });
      const data = result.data as { success: boolean; message: string };
      return data;
    } catch (error: any) {
      console.error("Error calling deleteUser cloud function:", error);
      const errorMessage = error.details?.message || error.message || "An unknown error occurred while calling the cloud function.";
      return { success: false, message: errorMessage };
    }
  };

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
      updateUserByAdmin,
      deleteUserByAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
