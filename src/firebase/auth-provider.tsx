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

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/verify-email'];

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
      setUser(firebaseUser); // Set user immediately

      if (firebaseUser) {
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
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]);

  // Effect for routing ONLY
  useEffect(() => {
    if (loading) return;

    const isAuthPath = AUTH_PATHS.includes(pathname);
    const isOnVerifyEmailPage = pathname === '/verify-email';

    // Case 1: User is NOT logged in.
    if (!user) {
      // If they are on a protected page, redirect to /login.
      if (!isAuthPath) {
        router.push('/login');
      }
      // If they are on the verify email page without being logged in (e.g. after logout), also redirect to /login.
      if (isOnVerifyEmailPage) {
        router.push('/login');
      }
      // Otherwise, they are on /login, /signup, etc. which is fine.
      return;
    }

    // From here, we know `user` is not null.

    // Case 2: User is logged in, but NOT verified.
    if (!user.emailVerified) {
      // If they are trying to access a protected page, redirect to /verify-email.
      if (!isAuthPath) {
        router.push('/verify-email');
      }
      // Otherwise, they are on an auth page. Let them stay, they might need to use "forgot password" or want to logout.
      return;
    }
    
    // Case 3: User is logged in AND verified.
    if (user.emailVerified) {
      // If they are on any auth page, redirect to dashboard.
      if (isAuthPath) {
        router.push('/dashboard');
      }
      // Otherwise they are on a protected page, which is correct.
      return;
    }

  }, [user, loading, pathname, router]);

  const logout = useCallback(async () => {
    await signOut(auth);
    // The onAuthStateChanged listener and routing effect will handle the rest.
  }, [auth]);
  
  // While loading, or if routing hasn't happened yet, show a loader.
  const isAuthPath = AUTH_PATHS.includes(pathname);
  if (loading || (!user && !isAuthPath)) {
      return <FullScreenLoader />;
  }

  // If user is logged in but not verified, and trying to access dashboard, show loader
  // while redirecting to /verify-email.
  if (user && !user.emailVerified && !isAuthPath) {
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
