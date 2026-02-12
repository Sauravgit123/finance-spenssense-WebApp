'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useAuth } from '@/firebase/auth-provider';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DollarSign } from 'lucide-react';

const formSchema = z.object({
  income: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive({ message: 'Income must be a positive number.' })
  ),
});

export function SetIncomeCard() {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      income: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsLoading(true);

    const userDocRef = doc(db, 'users', user.uid);
    const updatedData = {
        income: values.income,
      };

    setDoc(userDocRef, updatedData, { merge: true })
      .then(() => {
        toast({
          title: 'Income Saved!',
          description: `Your monthly income has been set.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="glassmorphism w-full max-w-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Welcome to SpendSense!
            </CardTitle>
            <CardDescription>
                To get started, please set your total monthly income. This will help us create your budget.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="income"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Monthly Income ($)</FormLabel>
                    <FormControl>
                        <Input type="number" step="100" placeholder="e.g., 5000" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Set Income & Start'}
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
    </div>
  );
}
