'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore, useFirebaseStorage } from '@/firebase/provider';
import { Loader2, User, Camera, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// This function is used to create a centered crop of 1:1 aspect ratio
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}


const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters.'),
  bio: z.string().max(160, 'Bio must be less than 160 characters.').optional(),
  currency: z.string().optional(),
  savingsGoal: z.preprocess(
    (a) => (a === '' ? undefined : parseFloat(z.string().parse(a))),
    z.number().min(0, 'Savings goal must be positive.').optional()
  ),
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
  
  // This state holds the URL for the visual preview of the image. It's updated immediately.
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Cropping state
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = 1;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
      currency: 'USD',
      savingsGoal: 0,
    },
  });

  useEffect(() => {
    if (userData) {
      form.reset({
        displayName: userData.displayName || '',
        bio: userData.bio || '',
        currency: userData.currency || 'USD',
        savingsGoal: userData.savingsGoal || 0,
      });
      setImagePreview(userData.photoURL || null);
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
        })
        setImagePreview(user.photoURL || null);
    }
  }, [userData, user, form]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(e.target.files[0]);
      setIsCropModalOpen(true);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const handleCropSave = async () => {
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!image || !canvas || !completedCrop) {
      throw new Error('Crop details not available');
    }
  
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
  
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
  
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }
  
    const pixelRatio = window.devicePixelRatio;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';
  
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );
  
    // Get cropped image as data URL and file
    const base64Image = canvas.toDataURL('image/jpeg', 1.0);
    setImagePreview(base64Image); // Update preview immediately
  
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      const croppedFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      setImageFile(croppedFile); // Set the file to be uploaded on submit
    }, 'image/jpeg', 1.0);
  
    setIsCropModalOpen(false);
  };
  

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsUpdating(true);

    try {
      // Start with the current photoURL from the most reliable source (userData or user)
      let photoURLToUpdate: string | null = userData?.photoURL || user.photoURL || null;

      // Step 1: Handle new image upload
      if (imageFile) {
        const filePath = `profile-pictures/${user.uid}/profile.jpg`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        photoURLToUpdate = await getDownloadURL(uploadResult.ref);
      } 
      // Step 2: Handle image removal
      else if (imagePreview === null && photoURLToUpdate) {
        // Image was removed via the button, and there was a URL before
        const filePath = `profile-pictures/${user.uid}/profile.jpg`;
        const storageRef = ref(storage, filePath);
        try {
            await deleteObject(storageRef);
        } catch (error: any) {
            // Ignore if the object doesn't exist, but log other errors
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old profile picture:", error);
            }
        }
        photoURLToUpdate = null;
      }
      
      // Step 3: Prepare data for Auth and Firestore
      const profileUpdates = {
        displayName: data.displayName,
        photoURL: photoURLToUpdate,
      };

      const firestoreData = {
        ...profileUpdates,
        bio: data.bio,
        currency: data.currency,
        savingsGoal: data.savingsGoal ?? 0,
      };

      // Step 4: Update Firebase Auth Profile & Firestore Document
      await updateProfile(user, profileUpdates);
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, firestoreData, { merge: true });

      // Step 5: Manually trigger a refresh of the user data context
      await refreshUserData();

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

      // Clear the temporary file object
      setImageFile(null); 
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'There was an error updating your profile.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Manage your profile and settings.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Manage your profile and settings.</CardDescription>
          </CardHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="p-6 md:p-8">
              <div className="w-full space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-32 w-32 border-4 border-white/10 shadow-lg">
                    <AvatarImage src={imagePreview ?? undefined} />
                    <AvatarFallback className="bg-transparent">
                      <User className="h-16 w-16 text-slate-400" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" /> Upload Picture
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={onSelectFile}
                      className="hidden"
                      accept="image/png, image/jpeg, image/gif"
                    />
                    {imagePreview && (
                      <Button type="button" variant="ghost" onClick={handleRemoveImage} className="text-red-400 hover:text-red-400 hover:bg-red-400/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Remove Picture
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-slate-300">
                    Display Name
                  </Label>
                  <Input id="displayName" {...form.register('displayName')} placeholder="Your Name" className="bg-white/5 border-white/20" />
                  {form.formState.errors.displayName && <p className="text-red-400 text-sm mt-1">{form.formState.errors.displayName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-300">
                    Bio
                  </Label>
                  <Textarea id="bio" {...form.register('bio')} placeholder="Tell us about yourself..." className="bg-white/5 border-white/20" />
                  {form.formState.errors.bio && <p className="text-red-400 text-sm mt-1">{form.formState.errors.bio.message}</p>}
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Financial Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-slate-300">
                        Currency
                      </Label>
                      <Controller
                        name="currency"
                        control={form.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="w-full bg-white/5 border-white/20">
                              <SelectValue placeholder="Select Currency" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900/80 backdrop-blur-md border-white/20">
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                              <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                              <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                              <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="savingsGoal" className="text-slate-300">
                        Monthly Savings Goal ($)
                      </Label>
                      <Input id="savingsGoal" type="number" {...form.register('savingsGoal')} placeholder="e.g., 500" className="bg-white/5 border-white/20" />
                      {form.formState.errors.savingsGoal && <p className="text-red-400 text-sm mt-1">{form.formState.errors.savingsGoal.message}</p>}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-sky-500 text-primary-foreground hover:shadow-lg hover:shadow-sky-500/20 transition-all text-base py-6" disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="animate-spin" /> : 'Update Profile'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900/80 backdrop-blur-md border-white/20">
          <DialogHeader>
            <DialogTitle>Crop your new picture</DialogTitle>
            <DialogDescription>
              Adjust the selection to crop your image. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {imgSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="max-h-[70vh]"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                onLoad={onImageLoad}
                style={{ transform: 'scale(1) rotate(0deg)' }}
              />
            </ReactCrop>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCropSave}>Save Crop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <canvas ref={previewCanvasRef} style={{ display: 'none' }}/>
    </>
  );
}
