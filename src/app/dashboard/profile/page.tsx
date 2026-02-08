'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore, useFirebaseStorage } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ImageCropper } from '@/components/dashboard/image-cropper';

const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const db = useFirestore();
  const storage = useFirebaseStorage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user?.photoURL || null);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user?.displayName || '',
    },
  });

  useEffect(() => {
    if (user) {
        form.reset({ displayName: user.displayName || '' });
        if (user.photoURL) {
            setImagePreview(user.photoURL);
        }
    }
  }, [user, form]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (blob: Blob) => {
    setImageFile(blob);
    setImagePreview(URL.createObjectURL(blob));
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsLoading(true);

    try {
      let newPhotoURL = user.photoURL;

      // The slowest part is uploading the image. We have to wait for this.
      if (imageFile) {
        const fileRef = storageRef(storage, `profile-pictures/${user.uid}`);
        await uploadBytes(fileRef, imageFile, { contentType: 'image/jpeg' });
        newPhotoURL = await getDownloadURL(fileRef);
      }
      
      // After upload, let other updates happen in the background without blocking the UI.
      const updatedUserData = {
        displayName: values.displayName,
        photoURL: newPhotoURL,
      };

      // Update Firebase Auth user profile (don't await)
      updateProfile(user, updatedUserData).catch((error) => {
        console.error("Error updating auth profile", error);
        toast({
            variant: "destructive",
            title: "Error updating profile.",
            description: "There was a problem updating your authentication profile."
        });
      });

      // Update Firestore document (don't await)
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, updatedUserData)
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updatedUserData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
        
      // The onAuthStateChanged listener in AuthProvider will eventually update the UI.
      toast({
        title: 'Profile update started!',
        description: 'Your changes are being saved in the background.',
      });
      setImageFile(null);
      setIsLoading(false); // Unblock the UI immediately

    } catch (error: any) {
      // This will now primarily catch errors from the image upload.
      toast({
        variant: 'destructive',
        title: 'Uh oh! Image upload failed.',
        description: error.message || 'Could not upload your profile picture.',
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
       {isCropperOpen && (
        <ImageCropper
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          image={imageToCrop}
          onCropComplete={onCropComplete}
        />
      )}
       <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Your Profile</CardTitle>
            <CardDescription>
              Update your personal information and profile picture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormItem className="flex flex-col items-center space-y-4 pt-6">
                  <FormLabel>Profile Picture</FormLabel>
                  <label htmlFor="profile-picture-upload" className="cursor-pointer rounded-full">
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={imagePreview || ''} alt={user?.displayName || ''} />
                        <AvatarFallback className="text-4xl bg-muted">
                            {getInitials(user?.displayName)}
                        </AvatarFallback>
                    </Avatar>
                  </label>
                  <FormControl>
                    <Input 
                      id="profile-picture-upload"
                      type="file" 
                      accept="image/png, image/jpeg"
                      onChange={handleImageChange}
                      className="sr-only"
                      onClick={(e: React.MouseEvent<HTMLInputElement>) => (e.currentTarget.value = '')}
                    />
                  </FormControl>
                   <Button asChild variant="outline" size="sm">
                       <label htmlFor="profile-picture-upload" className="cursor-pointer">
                           Choose Image
                       </label>
                   </Button>
                  <FormMessage />
                </FormItem>

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-white/5 border-white/20"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-sky-500 text-primary-foreground hover:shadow-lg hover:shadow-sky-500/20 transition-all" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
