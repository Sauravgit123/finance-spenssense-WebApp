'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore, useFirebaseStorage } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, useEffect, ChangeEvent, useMemo } from 'react';
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
import { ArrowLeft, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/dashboard/image-cropper';
import { defaultAvatars } from '@/lib/default-avatars';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

  // This is the critical fix: `useMemo` prevents the carousel options
  // from being recreated on every render, which was causing the crash.
  const carouselOpts = useMemo(() => ({
    align: 'start' as const,
    loop: true,
  }), []);

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
    // Only re-run this effect if the user object itself changes.
  }, [user, form.reset]);

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
    setSelectedDefaultUrl(null); // Deselect any default avatar
    setIsCropperOpen(false);
  };
  
  const handleDefaultAvatarSelect = (url: string) => {
    setImageFile(null); // A default avatar was chosen, so clear any uploaded file
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

      // Priority 1: A new file was uploaded and cropped
      if (imageFile) {
        const fileRef = storageRef(storage, `profile-pictures/${user.uid}`);
        await uploadBytes(fileRef, imageFile, { contentType: 'image/jpeg' });
        newPhotoURL = await getDownloadURL(fileRef);
      } 
      // Priority 2: A new default avatar was selected
      else if (selectedDefaultUrl && selectedDefaultUrl !== user.photoURL) {
        newPhotoURL = selectedDefaultUrl;
      }
      
      const updatedUserData: {displayName: string; photoURL?: string | null} = {
        displayName: values.displayName,
        photoURL: newPhotoURL,
      };

      // Update auth profile first
      await updateProfile(user, {
        displayName: updatedUserData.displayName,
        photoURL: updatedUserData.photoURL,
      });

      // Then update firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: updatedUserData.displayName,
        photoURL: updatedUserData.photoURL,
      });
        
      toast({
        title: 'Profile Updated!',
        description: 'Your changes have been saved. Refreshing the page to see changes.',
      });
      
      // Use a timeout to give the user time to read the toast
      setTimeout(() => window.location.reload(), 2000);

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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="flex flex-col items-center text-center space-y-4 pt-2">
                    <label htmlFor="profile-picture-upload" className="cursor-pointer rounded-full group relative">
                        <Avatar className="h-40 w-40 border-4 border-white/10 shadow-lg">
                            <AvatarImage src={imagePreview || ''} alt={user?.displayName || ''} />
                            <AvatarFallback className="text-5xl bg-muted">
                                {getInitials(user?.displayName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-center text-white">
                                <Upload className="h-8 w-8 mx-auto" />
                                <span className="text-sm font-medium">Change Photo</span>
                            </div>
                        </div>
                    </label>
                    <FormControl>
                        <Input 
                        id="profile-picture-upload"
                        type="file" 
                        accept="image/png, image/jpeg"
                        onChange={handleImageChange}
                        className="sr-only"
                        // This allows re-uploading the same file name
                        onClick={(e: React.MouseEvent<HTMLInputElement>) => (e.currentTarget.value = '')}
                        />
                    </FormControl>
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
                
                <Separator className="bg-white/10" />

                <div className="space-y-4 w-full">
                    <FormLabel className="font-semibold text-center block">Or choose an avatar</FormLabel>
                    <Carousel
                        opts={carouselOpts}
                        className="w-full max-w-sm sm:max-w-md mx-auto"
                    >
                        <CarouselContent className="-ml-2">
                            {defaultAvatars.map((url, index) => (
                                <CarouselItem key={url} className="pl-2 basis-1/4 sm:basis-1/5">
                                    <div
                                        onClick={() => handleDefaultAvatarSelect(url)}
                                        className={cn(
                                        "rounded-full p-1 cursor-pointer transition-all aspect-square ring-offset-background ring-offset-slate-900 ring-offset-2",
                                        imagePreview === url && !imageFile ? "ring-2 ring-sky-400" : "hover:ring-1 hover:ring-sky-500/50"
                                        )}
                                    >
                                        <Avatar className="h-full w-full">
                                            <AvatarImage src={url} alt={`Default Avatar ${index + 1}`} />
                                            <AvatarFallback>AV</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden sm:flex" />
                        <CarouselNext className="hidden sm:flex" />
                    </Carousel>
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
