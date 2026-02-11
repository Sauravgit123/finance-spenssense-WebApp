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
  refreshUserData: () => Promise<void>;
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

  const refreshUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Manually reload the user's profile from Firebase Auth servers
    await currentUser.reload();
    // This gives us the most up-to-date auth-level info (displayName, photoURL)
    // We need to create a new object to trigger a re-render in consumers of the context
    setUser({ ...auth.currentUser } as User);
    
    // Also re-fetch the firestore doc for a more immediate UI update
    const userDocRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data() as UserData);
    }
  }, [auth, db]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Set up a real-time listener for Firestore data
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, 
          (doc) => {
            setUser(firebaseUser); // ensure user is updated from auth state change
            setUserData(doc.data() as UserData || null);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching user data:", error);
            setUser(firebaseUser);
            setUserData(null);
            setLoading(false);
          }
        );
        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
        if (!['/login', '/signup'].includes(pathname)) {
          router.push('/login');
        }
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db, router, pathname]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);
  
  if (loading && !['/login', '/signup'].includes(pathname)) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Skeleton className="h-8 w-32" />
          <div className="ml-auto">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
           <Skeleton className="h-96 w-full" />
        </main>
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
