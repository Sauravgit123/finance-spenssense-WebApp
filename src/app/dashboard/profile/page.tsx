'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore, useFirebaseStorage } from '@/firebase/provider';
import { Loader2, User, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters.'),
  bio: z.string().max(160, 'Bio must be less than 160 characters.').optional(),
  currency: z.string().optional(),
  savingsGoal: z.preprocess(
    (a) => a === '' ? undefined : parseFloat(z.string().parse(a)),
    z.number().min(0, 'Savings goal must be positive.').optional()
  ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const storage = useFirebaseStorage();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          form.reset({
            displayName: data.displayName || user.displayName || '',
            bio: data.bio || '',
            currency: data.currency || 'USD',
            savingsGoal: data.savingsGoal || 0,
          });
          setAvatarPreview(data.photoURL || null);
        } else {
             form.reset({
                displayName: user.displayName || '',
             });
             setAvatarPreview(user.photoURL || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch your profile data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, authLoading, db, form, toast]);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleRemovePicture = async () => {
    if (!user) return;
    
    const oldPhotoURL = user.photoURL;
    if (!oldPhotoURL && !avatarPreview) return; // Nothing to remove

    setIsUpdating(true);

    try {
        await updateProfile(user, { photoURL: "" });
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { photoURL: "" });

        if (oldPhotoURL && oldPhotoURL.includes('firebasestorage.googleapis.com')) {
            try {
                const oldStorageRef = ref(storage, oldPhotoURL);
                await deleteObject(oldStorageRef);
            } catch (storageError: any) {
                if (storageError.code !== 'storage/object-not-found') {
                    console.warn("Could not delete old avatar from storage:", storageError);
                }
            }
        }
        
        setAvatarFile(null);
        setAvatarPreview(null);
        toast({
            title: 'Picture Removed',
            description: 'Your profile picture has been removed.',
        });
    } catch(error) {
        console.error("Error removing picture:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not remove your profile picture.',
        });
    } finally {
        setIsUpdating(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsUpdating(true);

    let newPhotoURL = user.photoURL;

    try {
        if (avatarFile) {
            const storageRef = ref(storage, `profile-pictures/${user.uid}`);
            await uploadBytes(storageRef, avatarFile);
            newPhotoURL = await getDownloadURL(storageRef);
        }

        const userDocRef = doc(db, 'users', user.uid);
        
        const updatedData: Partial<UserData> = {
            displayName: data.displayName,
            bio: data.bio,
            currency: data.currency,
            savingsGoal: data.savingsGoal ?? 0,
            photoURL: newPhotoURL,
        };
        
        await updateProfile(user, {
            displayName: data.displayName,
            photoURL: newPhotoURL,
        });
        await updateDoc(userDocRef, updatedData);

        setAvatarFile(null);

        toast({
            title: 'Profile Updated',
            description: 'Your profile has been successfully updated.',
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'There was an error updating your profile.',
        });
    } finally {
        setIsUpdating(false);
    }
  };

  if (authLoading || isLoading) {
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
    <div className="container mx-auto p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your profile and settings.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="p-6 md:p-8">
            <div className="w-full space-y-6">
              
              <div className="space-y-4">
                  <Label className="text-slate-300">Profile Picture</Label>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-white/20">
                      <AvatarImage src={avatarPreview || undefined} alt="User Avatar" />
                      <AvatarFallback className="bg-transparent">
                        <User className="h-10 w-10 text-slate-400" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                        <Button asChild variant="outline" className="relative">
                            <label htmlFor="avatar-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Picture
                                <Input id="avatar-upload" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                            </label>
                        </Button>
                        {(avatarPreview || user?.photoURL) && (
                            <Button variant="destructive" type="button" onClick={handleRemovePicture} disabled={isUpdating}>
                                <X className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        )}
                    </div>
                  </div>
                </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-slate-300">Display Name</Label>
                <Input id="displayName" {...form.register('displayName')} placeholder="Your Name" className="bg-white/5 border-white/20"/>
                {form.formState.errors.displayName && <p className="text-red-400 text-sm mt-1">{form.formState.errors.displayName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-slate-300">Bio</Label>
                <Textarea id="bio" {...form.register('bio')} placeholder="Tell us about yourself..." className="bg-white/5 border-white/20"/>
                    {form.formState.errors.bio && <p className="text-red-400 text-sm mt-1">{form.formState.errors.bio.message}</p>}
              </div>
            
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Financial Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="currency" className="text-slate-300">Currency</Label>
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
                        <Label htmlFor="savingsGoal" className="text-slate-300">Monthly Savings Goal ($)</Label>
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
  );
}
