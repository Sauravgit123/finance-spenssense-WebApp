'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

  // Effect for auth state ONLY
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            console.warn("User document not found for UID:", firebaseUser.uid);
            setUserData(null);
            await signOut(auth);
          }
        } catch (error) {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setUserData(null);
          await signOut(auth);
        } finally {
          setLoading(false);
        }
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
    await signOut(auth);
    // Explicitly navigate to login after sign out for a clean transition
    router.push('/login');
  }, [auth, router]);
  
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  
  // Show a loader during initial auth check, or on protected pages when the user is not yet authenticated
  // This prevents flickering content before the redirect can happen.
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
