'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebaseAuth, useFirestore } from './provider';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserData } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { SpendSenseLogo } from '@/components/logo';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
             // If user exists in Auth but not Firestore, something is wrong.
             // This can happen if doc creation fails on signup.
             // For a better UX, sign them out to force a clean state.
            await signOut(auth);
          }
        } catch (error) {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setUserData(null);
          await signOut(auth); // Sign out on permission error
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.push('/login');
        }
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db, router, pathname]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);
  
  if (loading && !PUBLIC_PATHS.includes(pathname)) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <div className="relative z-10 flex flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-white/5 px-6 backdrop-blur-xl">
                    <SpendSenseLogo />
                </header>
                <main className="flex-1">
                    <div className="container mx-auto p-4 md:p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <Skeleton className="h-10 w-48" />
                                <Skeleton className="h-4 w-64 mt-2" />
                            </div>
                        </div>
                        <Skeleton className="h-12 w-full" />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Skeleton className="h-24 rounded-lg" />
                            <Skeleton className="h-24 rounded-lg" />
                            <Skeleton className="h-24 rounded-lg" />
                            <Skeleton className="h-24 rounded-lg" />
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-40 rounded-lg" />
                            <Skeleton className="h-40 rounded-lg" />
                            <Skeleton className="h-40 rounded-lg" />
                        </div>
                        <Skeleton className="h-80 rounded-lg" />
                    </div>
                </main>
            </div>
        </div>
    );
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
