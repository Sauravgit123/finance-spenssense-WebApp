'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebaseAuth, useFirestore } from './provider';
import { useRouter, usePathname } from 'next/navigation';
import type { UserData } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { SpendSenseLogo } from '@/components/logo';
import { LiveBackground } from '@/components/live-background';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

const FullScreenLoader = () => (
    <div className="flex min-h-screen w-full flex-col items-center justify-center">
      <LiveBackground />
      <div className="relative z-10 animate-pulse">
        <SpendSenseLogo />
      </div>
    </div>
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Effect for auth state AND user data fetching
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // User is logged in, now listen for their data document in real-time
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, 
          (doc) => {
            if (doc.exists()) {
              setUserData(doc.data() as UserData);
            } else {
              console.warn("User document not found for UID:", firebaseUser.uid);
              setUserData(null);
            }
            setLoading(false); // Auth and initial data check is complete
          },
          (error) => {
            console.error("Error fetching user document:", error);
             // Only emit error if a user is still logged in. This prevents errors during logout.
             if (auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'get',
                });
                errorEmitter.emit('permission-error', permissionError);
             }
            setUserData(null);
            setLoading(false); // Auth and initial data check is complete
          }
        );
        
        return () => unsubscribeDoc();

      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]);

  // Effect for routing ONLY
  useEffect(() => {
    if (loading) return; // Don't do anything until auth state is resolved

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    // If user is not logged in and is trying to access a protected page, redirect to login
    if (!user && !isPublicPath) {
      router.push('/login');
    }
    
    // If user is logged in and is on a public auth page, redirect to dashboard
    if (user && isPublicPath) {
      router.push('/dashboard');
    }

  }, [user, loading, pathname, router]);

  const logout = useCallback(async () => {
    // This will sign the user out, and the useEffect hooks above will handle
    // the state cleanup and redirection automatically.
    await signOut(auth);
  }, [auth]);
  
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  
  if (loading || (!user && !isPublicPath)) {
      return <FullScreenLoader />;
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
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
