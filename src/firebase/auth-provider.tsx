'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useFirebaseAuth } from './provider';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  forceUpdate: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser && !['/login', '/signup'].includes(pathname)) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  const logout = useCallback(async () => {
    await signOut(auth);
    router.push('/login');
  }, [auth, router]);
  
  const forceUpdate = useCallback(() => {
    // This triggers a reload of the user's profile from Firebase.
    // onAuthStateChanged will then fire with the updated user data,
    // which updates our state and causes a re-render across the app.
    auth.currentUser?.reload().catch((error) => {
      console.error("Error reloading user:", error);
    });
  }, [auth]);

  if (loading) {
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
    <AuthContext.Provider value={{ user, loading, logout, forceUpdate }}>
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
