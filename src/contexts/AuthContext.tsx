

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
  sendEmailVerification,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, runTransaction, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db, functions } from '@/lib/firebase';
import type { IScribe, Translation } from '@/types';
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
  resendVerificationEmail: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  user: User | null;
  firebaseUser: FirebaseUser | null;
  updateUserProfile: (updates: { displayName?: string, photoURL?: string }) => Promise<boolean>;
  // IScribe methods
  saveIScribe: (iScribeData: Omit<IScribe, 'id' | 'userId'>) => Promise<string | null>;
  getUserIScribes: () => Promise<IScribe[]>;
  getIScribeById: (id: string) => Promise<IScribe | null>;
  updateIScribe: (id: string, updates: Partial<IScribe>) => Promise<boolean>;
  deleteIScribe: (id: string) => Promise<boolean>;
  // Translation methods
  saveTranslation: (translationData: Omit<Translation, 'id' | 'userId'>) => Promise<string | null>;
  getUserTranslations: () => Promise<Translation[]>;
  getTranslationById: (id: string) => Promise<Translation | null>;
  deleteTranslation: (id: string) => Promise<boolean>;
  // Admin methods
  getAllUsers: () => Promise<User[]>;
  getAllIScribes: () => Promise<IScribe[]>;
  updateUserByAdmin: (uid: string, updates: Partial<User>) => Promise<boolean>;
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

  const newUserInfoRef = React.useRef<NewUserInfo | null>(null);
  const pathnameRef = React.useRef<string>(pathname);

  // Keep refs up-to-date without causing re-renders
  useEffect(() => {
    newUserInfoRef.current = newUserInfo;
  }, [newUserInfo]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const createUserProfile = async (fbUser: FirebaseUser, displayName: string, username: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    try {
      const newUserProfile: Omit<User, 'createdAt' | 'lastLogin'> & { createdAt: any, lastLogin: any } = {
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

      await setDoc(userDocRef, newUserProfile);

      // Return the complete user profile immediately
      return {
        ...newUserProfile,
        createdAt: new Date(),
        lastLogin: new Date(),
      };
    } catch (error) {
      console.error("Error creating user profile via setDoc: ", error);
      await signOut(auth);
      throw error; // Rethrow to be caught by the calling function
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // Step 1: Immediately unblock the UI - Firebase Auth is resolved (fast)
        setFirebaseUser(fbUser);

        // Build a minimal user object from what Firebase Auth already knows.
        // This allows routing and UI to work instantly, before Firestore loads.
        const minimalUser: User = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          username: fbUser.email?.split('@')[0] || null,
          role: 'user',
          accountStatus: 'active',
          createdAt: null,
          lastLogin: null,
        };
        setUser(minimalUser);
        setIsLoading(false); // Unblock the UI immediately!

        // Step 2: Load the full Firestore profile in the background (non-blocking)
        const userDocRef = doc(db, 'users', fbUser.uid);
        getDoc(userDocRef).then(async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.accountStatus === 'disabled') {
              console.warn(`Login attempt by disabled user: ${fbUser.email}`);
              await signOut(auth);
              setUser(null);
              setFirebaseUser(null);
              return;
            }
            // Enrich user with full Firestore profile
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              username: userData.username,
              displayName: userData.displayName || fbUser.displayName,
              photoURL: userData.photoURL || fbUser.photoURL,
              role: userData.role || 'user',
              accountStatus: userData.accountStatus || 'active',
              createdAt: userData.createdAt?.toDate() || null,
              lastLogin: new Date(),
            });
            // Update lastLogin in background, don't await it
            if (pathnameRef.current !== '/dashboard/admin') {
              updateDoc(userDocRef, { lastLogin: serverTimestamp() }).catch(() => { });
            }
          } else {
            // New user - create their profile document
            const isGoogleSignIn = fbUser.providerData.some(p => p.providerId === 'google.com');
            const currentUserInfo = newUserInfoRef.current;
            let profileData: NewUserInfo;

            if (isGoogleSignIn) {
              profileData = {
                displayName: fbUser.displayName || "New User",
                username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0, 5)}`
              };
            } else if (currentUserInfo) {
              profileData = currentUserInfo;
              setNewUserInfo(null);
            } else {
              profileData = {
                displayName: fbUser.displayName || "New User",
                username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0, 5)}`
              };
            }

            createUserProfile(fbUser, profileData.displayName, profileData.username)
              .then((userProfile) => {
                if (userProfile) setUser(userProfile);
              })
              .catch((err) => {
                console.error("Failed to create user profile:", err);
                signOut(auth);
                setUser(null);
                setFirebaseUser(null);
              });
          }
        }).catch((err) => {
          console.error("[AuthContext] Firestore getDoc failed (non-blocking):", err);
          // Keep the user logged in via Firebase Auth; just won't have Firestore enrichment
        });

      } else {
        // User logged out
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !isLoading && !!user;

  useEffect(() => {
    const publicRoutes = ['/login', '/signup', '/', '/learn-more', '/verify-email', '/contact', '/landing'];
    const isPublicRoute = publicRoutes.includes(pathname);
    const isAdminRoute = pathname.startsWith('/dashboard/admin');

    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.push('/login');
      } else if (isAuthenticated) {
        const isGoogleSignIn = firebaseUser?.providerData.some(p => p.providerId === 'google.com');
        const isVerified = firebaseUser?.emailVerified || isGoogleSignIn;

        if (!isVerified && pathname !== '/verify-email') {
          router.push('/verify-email');
        } else if (isVerified && (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/verify-email')) {
          router.push('/dashboard/iscribe');
        } else if (isVerified && isAdminRoute && user?.role !== 'admin') {
          router.push('/dashboard/iscribe');
        }
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, user, firebaseUser]);

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
      const userCredential = await createUserWithEmailAndPassword(auth, emailIn, passwordIn);
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
      }
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
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'consent' }); // Force consent screen
      setNewUserInfo(null);
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error Code:", error.code, "Message:", error.message);
      } else {
        console.log("Google Sign-In popup closed by user.");
      }
      setIsLoading(false);
      return false;
    }
  };

  const resendVerificationEmail = async (): Promise<boolean> => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        return true;
      } catch (error) {
        console.error("Error resending verification email:", error);
        return false;
      }
    }
    return false;
  };

  const resetPassword = async (emailIn: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, emailIn);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error; // Let caller process the error visually
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

  // IScribe Methods
  const saveIScribe = async (iScribeData: Omit<IScribe, 'id' | 'userId'>): Promise<string | null> => {
    if (!user) return null;
    try {
      const newIScribeRef = doc(collection(db, 'iscribes'));
      const newIScribe: IScribe = {
        id: newIScribeRef.id,
        userId: user.uid,
        ...iScribeData,
      };
      await setDoc(newIScribeRef, newIScribe);
      return newIScribeRef.id;
    } catch (error) {
      console.error("Error saving iscribe:", error);
      return null;
    }
  };

  const getUserIScribes = useCallback(async (): Promise<IScribe[]> => {
    if (!user) return [];
    try {
      const q = query(collection(db, 'iscribes'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const iscribes = querySnapshot.docs.map(doc => doc.data() as IScribe);
      iscribes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return iscribes;
    } catch (error) {
      console.error("Error fetching user iscribes:", error);
      return [];
    }
  }, [user]);

  const getIScribeById = useCallback(async (id: string): Promise<IScribe | null> => {
    if (!user) return null;
    try {
      const docRef = doc(db, 'iscribes', id);
      const docSnap = await getDoc(docRef);
      // Admin can view any iscribe, regular user can only view their own
      if (docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
        return docSnap.data() as IScribe;
      }
      return null;
    } catch (error) {
      console.error("Error fetching iscribe by ID:", error);
      return null;
    }
  }, [user]);

  const updateIScribe = async (id: string, updates: Partial<IScribe>): Promise<boolean> => {
    if (!user) return false;
    try {
      const docRef = doc(db, 'iscribes', id);
      const docSnap = await getDoc(docRef);
      // Admin or owner can update
      if (docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
        await updateDoc(docRef, updates);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating iscribe:", error);
      return false;
    }
  };

  const deleteIScribe = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const docRef = doc(db, 'iscribes', id);
      const docSnap = await getDoc(docRef);
      // Admin or owner can delete
      if (docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
        await deleteDoc(docRef);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting iscribe:", error);
      return false;
    }
  };

  // Translation Methods
  const saveTranslation = async (translationData: Omit<Translation, 'id' | 'userId'>): Promise<string | null> => {
    if (!user) return null;
    try {
      const newTranslationRef = doc(collection(db, 'translations'));
      const newTranslation: Translation = {
        id: newTranslationRef.id,
        userId: user.uid,
        ...translationData,
      };
      await setDoc(newTranslationRef, newTranslation);
      return newTranslationRef.id;
    } catch (error) {
      console.error("Error saving translation:", error);
      return null;
    }
  };

  const getUserTranslations = useCallback(async (): Promise<Translation[]> => {
    if (!user) return [];
    try {
      const q = query(collection(db, 'translations'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const translations = querySnapshot.docs.map(doc => doc.data() as Translation);
      translations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return translations;
    } catch (error) {
      console.error("Error fetching user translations:", error);
      return [];
    }
  }, [user]);

  const getTranslationById = useCallback(async (id: string): Promise<Translation | null> => {
    if (!user) return null;
    try {
      const docRef = doc(db, 'translations', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
        return docSnap.data() as Translation;
      }
      return null;
    } catch (error) {
      console.error("Error fetching translation by ID:", error);
      return null;
    }
  }, [user]);

  const deleteTranslation = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const docRef = doc(db, 'translations', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && (docSnap.data().userId === user.uid || user.role === 'admin')) {
        await deleteDoc(docRef);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting translation:", error);
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

  const updateUserByAdmin = async (uid: string, updates: Partial<User>): Promise<boolean> => {
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

  const getAllIScribes = useCallback(async (): Promise<IScribe[]> => {
    if (user?.role !== 'admin') return [];
    try {
      const querySnapshot = await getDocs(collection(db, "iscribes"));
      const iscribes = querySnapshot.docs.map(doc => doc.data() as IScribe);
      iscribes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return iscribes;
    } catch (error) {
      console.error("Error getting all iscribes:", error);
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
      resendVerificationEmail,
      resetPassword,
      user,
      firebaseUser,
      updateUserProfile,
      saveIScribe,
      getUserIScribes,
      getIScribeById,
      updateIScribe,
      deleteIScribe,
      saveTranslation,
      getUserTranslations,
      getTranslationById,
      deleteTranslation,
      getAllUsers,
      getAllIScribes,
      updateUserByAdmin,
      deleteUserByAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
