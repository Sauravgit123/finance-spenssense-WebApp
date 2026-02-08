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
import { ImageCropper } from '@/components/dashboard/image-cropper';
import { defaultAvatars } from '@/lib/default-avatars';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  const [selectedDefaultUrl, setSelectedDefaultUrl] = useState<string | null>(null);

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
    setSelectedDefaultUrl(null);
  };
  
  const handleDefaultAvatarSelect = (url: string) => {
    setImageFile(null);
    setImagePreview(url);
    setSelectedDefaultUrl(url);
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

      // 1. Upload image if a new one was cropped
      if (imageFile) {
        const fileRef = storageRef(storage, `profile-pictures/${user.uid}`);
        await uploadBytes(fileRef, imageFile, { contentType: 'image/jpeg' });
        newPhotoURL = await getDownloadURL(fileRef);
      } 
      // 2. Else, if a default avatar was selected, use its URL.
      else if (selectedDefaultUrl && selectedDefaultUrl !== user.photoURL) {
        newPhotoURL = selectedDefaultUrl;
      }
      
      const updatedUserData = {
        displayName: values.displayName,
        photoURL: newPhotoURL,
      };

      // 3. Update the user's auth profile
      await updateProfile(user, updatedUserData);

      // 4. Update the user's document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, updatedUserData);
        
      toast({
        title: 'Profile Updated!',
        description: 'Your changes have been saved. The page will now reload.',
      });
      
      // 5. Force a reload to ensure UI is correctly updated with new user info.
      window.location.reload();

    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save your profile.',
      });
    } finally {
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

                <div className="relative py-4">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">OR</span>
                </div>

                <div className="space-y-4 text-center">
                    <FormLabel>Select a default avatar</FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 max-w-md mx-auto">
                        {defaultAvatars.map((url) => (
                        <div
                            key={url}
                            onClick={() => handleDefaultAvatarSelect(url)}
                            className={cn(
                            "rounded-full p-1 cursor-pointer transition-all",
                            imagePreview === url && !imageFile ? "ring-2 ring-primary bg-primary/20" : "hover:scale-105"
                            )}
                        >
                            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mx-auto">
                            <AvatarImage src={url} alt="Default Avatar" />
                            <AvatarFallback>AV</AvatarFallback>
                            </Avatar>
                        </div>
                        ))}
                    </div>
                </div>

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
