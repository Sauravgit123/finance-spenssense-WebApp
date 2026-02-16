'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useAuth } from '@/firebase/auth-provider';
import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';

const settingsFormSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name must not be longer than 50 characters.' }),
  income: z.coerce.number().positive({ message: 'Income must be a positive number.' }),
  savingsGoal: z.coerce.number().min(0, { message: 'Savings goal cannot be negative.' }),
  bio: z.string().max(160, { message: 'Bio must not be longer than 160 characters.' }).optional(),
  currency: z.enum(['USD', 'INR', 'EUR']),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      displayName: '',
      income: 0,
      savingsGoal: 0,
      bio: '',
      currency: 'USD',
    },
  });

  const selectedCurrency = form.watch('currency');

  useEffect(() => {
    if (userData && !form.formState.isDirty) {
      form.reset({
        displayName: userData.displayName || '',
        income: userData.income || 0,
        savingsGoal: userData.savingsGoal || 0,
        bio: userData.bio || '',
        currency: userData.currency || 'USD',
      });
    }
  }, [userData, form]);

  async function onSubmit(values: SettingsFormValues) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save settings.' });
        return;
    }
    setIsLoading(true);

    const userDocRef = doc(db, 'users', user.uid);
    
    setDoc(userDocRef, values, { merge: true })
      .then(() => {
        toast({
          title: 'Settings Saved!',
          description: 'Your profile has been updated successfully.',
        });
        form.reset(values, { keepValues: true });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }
  
  if (authLoading) {
      return (
          <div className="container mx-auto p-4 md:p-8 max-w-2xl">
              <Skeleton className="h-10 w-48 mb-8" />
              <Card>
                  <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                  <CardContent className="space-y-6">
                      <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
        </Link>
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account settings and profile details.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                            <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="income"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Monthly Income ({selectedCurrency})</FormLabel>
                                <FormControl>
                                    <Input type="number" step="100" placeholder="e.g., 5000" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a currency" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="savingsGoal"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Monthly Savings Goal ({selectedCurrency})</FormLabel>
                        <FormControl>
                            <Input type="number" step="50" placeholder="e.g., 500" {...field} />
                        </FormControl>
                         <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Tell us a little bit about your financial goals."
                                className="resize-none"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
