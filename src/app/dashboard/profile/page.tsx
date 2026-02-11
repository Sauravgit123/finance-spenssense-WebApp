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
  displayName: z.string().optional(),
  bio: z.string().optional(),
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
  
    const base64Image = canvas.toDataURL('image/jpeg', 1.0);
    setImagePreview(base64Image);
  
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      const croppedFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      setImageFile(croppedFile);
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
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to update your profile.' });
      return;
    }
    setIsUpdating(true);

    try {
      let newPhotoURL = userData?.photoURL || user.photoURL || null;

      // Step 1: Handle new image upload
      if (imageFile) {
        const filePath = `profile-pictures/${user.uid}/profile.jpg`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        newPhotoURL = await getDownloadURL(uploadResult.ref);
      } 
      // Step 2: Handle image removal
      else if (imagePreview === null && (userData?.photoURL || user.photoURL)) {
        const filePath = `profile-pictures/${user.uid}/profile.jpg`;
        const storageRef = ref(storage, filePath);
        try {
            await deleteObject(storageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old profile picture:", error);
            }
        }
        newPhotoURL = null;
      }
      
      // Step 3: Prepare data for Auth and Firestore
      const authUpdates = {
        displayName: data.displayName,
        photoURL: newPhotoURL,
      };

      const firestoreData: Partial<UserData> = {
        displayName: data.displayName,
        bio: data.bio,
        currency: data.currency,
        savingsGoal: data.savingsGoal,
        photoURL: newPhotoURL,
      };

      // Step 4: Update Firebase Auth Profile & Firestore Document
      await updateProfile(user, authUpdates);
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
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
         <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-[1fr_300px]">
          <div>
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-7 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-48" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your profile and financial settings.</p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your display name and bio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                    <Avatar className="h-24 w-24 border shadow-sm">
                      <AvatarImage src={imagePreview ?? undefined} />
                      <AvatarFallback>
                        <User className="h-12 w-12 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center sm:items-start gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
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
                        <Button type="button" size="sm" variant="ghost" onClick={handleRemoveImage} className="text-destructive hover:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" {...form.register('displayName')} placeholder="Your Name" />
                    {form.formState.errors.displayName && <p className="text-sm text-destructive mt-1">{form.formState.errors.displayName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" {...form.register('bio')} placeholder="Tell us about yourself..." rows={4} />
                    {form.formState.errors.bio && <p className="text-sm text-destructive mt-1">{form.formState.errors.bio.message}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Settings</CardTitle>
                   <CardDescription>Set your preferred currency and goals.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Controller
                      name="currency"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                          <SelectContent>
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
                    <Label htmlFor="savingsGoal">Monthly Savings Goal ($)</Label>
                    <Input id="savingsGoal" type="number" {...form.register('savingsGoal')} placeholder="e.g., 500" />
                    {form.formState.errors.savingsGoal && <p className="text-sm text-destructive mt-1">{form.formState.errors.savingsGoal.message}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3 flex justify-end">
              <Button type="submit" size="lg" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="animate-spin mr-2" /> : null}
                {isUpdating ? 'Saving...' : 'Update Profile'}
              </Button>
            </div>
          </div>
        </form>
      </main>

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crop your new picture</DialogTitle>
            <DialogDescription>
              Adjust the selection to crop your image. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {imgSrc && (
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  style={{ transform: 'scale(1) rotate(0deg)' }}
                />
              </ReactCrop>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCropSave}>Save Crop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <canvas ref={previewCanvasRef} className="hidden"/>
    </>
  );
}
