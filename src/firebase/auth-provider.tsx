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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user && !['/login', '/signup'].includes(pathname)) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      // Create a new object to ensure React state detects the change
      setUser({ ...currentUser });
    }
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
