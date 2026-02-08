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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
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
    setSelectedDefaultUrl(null);
    setIsCropperOpen(false);
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

      if (imageFile) {
        const fileRef = storageRef(storage, `profile-pictures/${user.uid}`);
        await uploadBytes(fileRef, imageFile, { contentType: 'image/jpeg' });
        newPhotoURL = await getDownloadURL(fileRef);
      } 
      else if (selectedDefaultUrl && selectedDefaultUrl !== user.photoURL) {
        newPhotoURL = selectedDefaultUrl;
      }
      
      const updatedUserData: {displayName: string; photoURL?: string | null} = {
        displayName: values.displayName,
        photoURL: newPhotoURL,
      };

      await updateProfile(user, {
        displayName: updatedUserData.displayName,
        photoURL: updatedUserData.photoURL,
      });

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: updatedUserData.displayName,
        photoURL: updatedUserData.photoURL,
      });
        
      toast({
        title: 'Profile Updated!',
        description: 'Your changes have been saved. The page will now reload.',
      });
      
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
        <Card className="w-full max-w-4xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Your Profile</CardTitle>
            <CardDescription>
              Update your personal information and profile picture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left Column: Avatar Preview & Upload */}
                  <div className="md:col-span-1 flex flex-col items-center text-center space-y-4 pt-2">
                    <FormLabel className="font-semibold">Profile Picture</FormLabel>
                    <label htmlFor="profile-picture-upload" className="cursor-pointer rounded-full group relative">
                      <Avatar className="h-40 w-40">
                          <AvatarImage src={imagePreview || ''} alt={user?.displayName || ''} />
                          <AvatarFallback className="text-5xl bg-muted">
                              {getInitials(user?.displayName)}
                          </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm font-medium">Change</span>
                      </div>
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
                             Upload a Photo
                         </label>
                    </Button>
                  </div>

                  {/* Right Column: Name and Default Avatars */}
                  <div className="md:col-span-2 space-y-6">
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
                    
                    <div className="space-y-4">
                        <FormLabel>Or choose a default avatar</FormLabel>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                            {defaultAvatars.map((url) => (
                            <div
                                key={url}
                                onClick={() => handleDefaultAvatarSelect(url)}
                                className={cn(
                                "rounded-full p-1 cursor-pointer transition-all aspect-square",
                                imagePreview === url && !imageFile ? "ring-2 ring-primary bg-primary/20" : "hover:scale-105"
                                )}
                            >
                                <Avatar className="h-full w-full">
                                <AvatarImage src={url} alt="Default Avatar" />
                                <AvatarFallback>AV</AvatarFallback>
                                </Avatar>
                            </div>
                            ))}
                        </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-white/20">
                  <Button type="submit" className="w-full md:w-auto bg-gradient-to-r from-violet-600 to-sky-500 text-primary-foreground hover:shadow-lg hover:shadow-sky-500/20 transition-all" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
