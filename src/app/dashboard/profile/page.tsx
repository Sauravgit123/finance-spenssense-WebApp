'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore, useFirebaseStorage } from '@/firebase/provider';
import { Loader2, User, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Validation schema is now lenient. No fields are strictly required for an update.
const profileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const db = useFirestore();
  const storage = useFirebaseStorage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
    },
  });

  // Effect to populate the form and image preview once user data is loaded
  useEffect(() => {
    if (userData) {
      form.reset({
        displayName: userData.displayName || '',
        bio: userData.bio || '',
      });
      setImagePreview(userData.photoURL || null);
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
            bio: '',
        });
        setImagePreview(user.photoURL || null);
    }
  }, [userData, user, form]);

  // Handles file selection and sets up a local preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // The core function to handle profile updates
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsUpdating(true);

    try {
      // Use the current photoURL as a fallback
      let newPhotoURL = userData?.photoURL || user.photoURL || null;

      // Step 1: Upload a new image if one was selected
      if (imageFile) {
        const filePath = `profile-pictures/${user.uid}/${imageFile.name}`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        newPhotoURL = await getDownloadURL(uploadResult.ref);
      }
      
      // Step 2: Prepare data for Firestore and Auth updates
      const firestoreUpdates = {
        displayName: data.displayName,
        bio: data.bio,
        photoURL: newPhotoURL,
      };

      const authUpdates = {
        displayName: data.displayName,
        photoURL: newPhotoURL,
      };

      // Step 3: Perform the updates
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, firestoreUpdates, { merge: true }); // Use setDoc with merge to prevent overwriting
      await updateProfile(user, authUpdates);

      // Step 4: CRITICAL - Force a refresh of user data across the app
      await refreshUserData();

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'There was an error updating your profile.',
      });
    } finally {
      // Step 5: Always turn off the loading state
      setIsUpdating(false);
    }
  };

  // Renders a loading skeleton while waiting for user data
  if (authLoading) {
    return (
      <main className="container mx-auto max-w-2xl p-4 md:p-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-10 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
           <div className="flex justify-end">
              <Skeleton className="h-12 w-32" />
            </div>
        </div>
      </main>
    );
  }

  // The main profile form
  return (
    <main className="container mx-auto max-w-2xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">Update your personal information.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>This information will be displayed publicly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={imagePreview ?? undefined} />
                <AvatarFallback>
                  <User className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" />
                  Upload Picture
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif"
                />
                <p className="text-xs text-muted-foreground mt-2">PNG, JPG, or GIF.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                {...form.register('displayName')}
                placeholder="Your Name"
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                placeholder="Tell us a little about yourself"
                rows={3}
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isUpdating}>
            {isUpdating && <Loader2 className="animate-spin mr-2" />}
            {isUpdating ? 'Saving...' : 'Update Profile'}
          </Button>
        </div>
      </form>
    </main>
  );
}
