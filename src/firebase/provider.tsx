'use client';

import React, { createContext, useContext } from 'react';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { app } from './config';
import type { FirebaseApp } from 'firebase/app';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  return (
    <FirebaseContext.Provider value={{ app, auth, db, storage }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseAuth() {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
      throw new Error('useFirebaseAuth must be used within a FirebaseProvider');
    }
    return context.auth;
}

export function useFirestore() {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
      throw new Error('useFirestore must be used within a FirebaseProvider');
    }
    return context.db;
}

export function useFirebaseStorage() {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebaseStorage must be used within a FirebaseProvider');
    }
    return context.storage;
}
