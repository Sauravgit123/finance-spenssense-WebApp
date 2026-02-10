'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore, useFirebaseStorage } from '@/firebase/provider';
import { Loader2, Leaf, ShieldCheck, User, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // State for image handling
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  
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
    if (!user) return;

    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);
          form.reset({
            displayName: data.displayName || user.displayName || '',
            bio: data.bio || '',
            currency: data.currency || 'USD',
            savingsGoal: data.savingsGoal || 0,
          });
          setPreviewUrl(data.photoURL || '');
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
  }, [user, db, form, toast]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsUpdating(true);

    try {
        const updatedData: Partial<UserData> = {
            displayName: data.displayName,
            bio: data.bio,
            currency: data.currency,
            savingsGoal: data.savingsGoal ?? 0,
        };

        const authProfileUpdate: { displayName: string; photoURL?: string | null } = {
            displayName: data.displayName,
        };

        if (newImageFile) {
            const filePath = `profile-pictures/${user.uid}/${newImageFile.name}`;
            const imageRef = storageRef(storage, filePath);
            await uploadBytes(imageRef, newImageFile);
            const newPhotoURL = await getDownloadURL(imageRef);
            updatedData.photoURL = newPhotoURL;
            authProfileUpdate.photoURL = newPhotoURL;
        } else if (previewUrl === '' && userData?.photoURL) {
            // User cleared the image
            updatedData.photoURL = '';
            authProfileUpdate.photoURL = null; // This deletes the photoURL from Auth user
        }
        
        await updateProfile(user, authProfileUpdate);
        
        const userDocRef = doc(db, 'users', user.uid);
        updateDoc(userDocRef, updatedData).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        toast({
            title: 'Profile Updated',
            description: 'Your changes have been saved successfully.',
        });
        
        setNewImageFile(null);
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
            <Card className="w-full max-w-2xl bg-transparent border-none shadow-none">
                <CardHeader className="items-center">
                    <Skeleton className="h-32 w-32 rounded-full" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
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
  
  const isHealthy = (userData?.savingsGoal ?? 0) > 0;

  return (
    <div className="container mx-auto p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your profile and settings.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-white/20">
                    <AvatarImage src={previewUrl || null} alt="User profile" />
                    <AvatarFallback className="bg-muted">
                        <User className="text-muted-foreground h-16 w-16" />
                    </AvatarFallback>
                </Avatar>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/png, image/jpeg, image/gif"
                    className="hidden"
                />
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-slate-800/80 hover:bg-slate-700"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Upload image</span>
                </Button>
                {previewUrl && (
                  <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                          setPreviewUrl('');
                          setNewImageFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                  >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                  </Button>
                )}
              </div>

              <div className="w-full space-y-6">
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
                    <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
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

                <div className="flex justify-between items-center border-t border-white/10 pt-6">
                    <span className="text-lg font-semibold text-white">Financial Health</span>
                    <div className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                         isHealthy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    )}>
                        {isHealthy ? <ShieldCheck className="h-4 w-4"/> : <Leaf className="h-4 w-4"/>}
                        <span>{isHealthy ? 'On Track' : 'Set a Goal'}</span>
                    </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-sky-500 text-primary-foreground hover:shadow-lg hover:shadow-sky-500/20 transition-all text-base py-6" disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="animate-spin" /> : 'Update Profile'}
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
