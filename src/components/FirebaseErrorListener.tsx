'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

// This is a development-only component to surface Firestore permission errors.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In development, we want to throw the error to see the Next.js overlay
      if (process.env.NODE_ENV === 'development') {
        throw error;
      } else {
        // In production, just show a generic toast and log the error
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred. Please try again later.',
        });
      }
    };

    const unsubscribe = errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null; // This component does not render anything
}
