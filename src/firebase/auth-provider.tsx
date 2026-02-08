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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  // This version state is used to force re-renders when the user object is updated
  // in a way that doesn't trigger onAuthStateChanged (e.g., profile updates).
  const [, setVersion] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      // Force a re-render to ensure consumers get the latest user object from auth.currentUser
      setVersion(v => v + 1); 
      if (!user && !['/login', '/signup'].includes(pathname)) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  const logout = useCallback(async () => {
    await signOut(auth);
    router.push('/login');
    // onAuthStateChanged will handle re-rendering
  }, [auth, router]);
  
  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      // Force a re-render to make the updated user data available
      setVersion(v => v + 1);
    }
  }, [auth]);

  // By getting the user directly from the auth instance, we ensure we always have the
  // "live" user object, preventing stale data and issues with corrupted state.
  const user = auth.currentUser;

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
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
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
