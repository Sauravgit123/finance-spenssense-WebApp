'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore } from '@/firebase/provider';
import { Loader2, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

const defaultAvatars = [
  'https://api.dicebear.com/8.x/micah/svg?seed=boy-avatar-seed', // Boy
  'https://api.dicebear.com/8.x/micah/svg?seed=girl-avatar-seed' // Girl
];

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

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
          setSelectedAvatar(data.photoURL || null);
        } else {
             form.reset({
                displayName: user.displayName || '',
             });
             setSelectedAvatar(user.photoURL || null);
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
  
  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(prev => (prev === url ? null : url));
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsUpdating(true);

    const photoURLToUpdate = selectedAvatar;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        
        const updatedData: Partial<UserData> = {
            displayName: data.displayName,
            bio: data.bio,
            currency: data.currency,
            savingsGoal: data.savingsGoal ?? 0,
            photoURL: photoURLToUpdate,
        };
        
        await updateProfile(user, {
            displayName: data.displayName,
            photoURL: photoURLToUpdate,
        });
        await updateDoc(userDocRef, updatedData);

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
                  <Label className="text-slate-300">Choose Avatar</Label>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-white/20">
                      {selectedAvatar ? (
                        <AvatarImage src={selectedAvatar} alt="Selected Avatar" />
                      ) : null}
                      <AvatarFallback className="bg-transparent">
                        <User className="h-10 w-10 text-slate-400" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-4">
                      {defaultAvatars.map((avatarUrl) => (
                        <button
                          key={avatarUrl}
                          type="button"
                          onClick={() => handleAvatarSelect(avatarUrl)}
                          className={cn(
                            'rounded-full transition-all focus:outline-none',
                            selectedAvatar === avatarUrl
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                              : 'ring-1 ring-transparent hover:ring-1 hover:ring-primary/50'
                          )}
                        >
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback>
                              <User />
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      ))}
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
