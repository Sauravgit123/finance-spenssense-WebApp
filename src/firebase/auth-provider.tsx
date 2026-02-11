'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useFirebaseAuth, useFirestore } from './provider';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserData } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>; // Add this function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        if (!['/login', '/signup'].includes(pathname)) {
          router.push('/login');
        }
        return;
      }

      // User is signed in, set up Firestore listener
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, 
        (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          } else {
            setUserData(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching user data:", error);
          setUserData(null);
          setLoading(false);
        }
      );
      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [auth, db, router, pathname]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const refreshUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // The user object in state will be updated by onAuthStateChanged,
    // but we can manually re-fetch the firestore doc for immediate UI update.
    const userDocRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data() as UserData);
    }

    // Also update the user state with the latest from auth, in case displayName/photoURL changed
    setUser({ ...currentUser });
  }, [auth, db]);
  
  if (loading && !['/login', '/signup'].includes(pathname)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="w-full max-w-sm space-y-4 p-4">
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
