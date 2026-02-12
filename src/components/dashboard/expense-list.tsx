'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Expense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Trash2, Home, Sparkles, PiggyBank } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/firebase/auth-provider';
import { doc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ExpenseListProps {
  expenses: Expense[];
}

const categoryDetails = {
  Needs: { 
    icon: <Home className="h-4 w-4" />, 
    badgeVariant: 'default' as const,
    color: 'text-chart-1'
  },
  Wants: { 
    icon: <Sparkles className="h-4 w-4" />,
    badgeVariant: 'secondary' as const,
    color: 'text-chart-2'
  },
  Savings: { 
    icon: <PiggyBank className="h-4 w-4" />,
    badgeVariant: 'outline' as const,
    color: 'text-chart-3'
  },
};


export function ExpenseList({ expenses }: ExpenseListProps) {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return 'Just now';
    }
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteRequest = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !expenseToDelete) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete expense. User not found.',
      });
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
      return;
    }

    const expenseDocRef = doc(
      db,
      'users',
      user.uid,
      'expenses',
      expenseToDelete.id
    );

    deleteDoc(expenseDocRef)
      .then(() => {
        toast({
          title: 'Expense Deleted',
          description: `${expenseToDelete.name} has been removed.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: expenseDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
      });
  };

  return (
    <>
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>
            A list of your most recent transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center"
                  >
                    No expenses added yet.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.slice(0, 10).map((expense) => {
                  const details = categoryDetails[expense.category as keyof typeof categoryDetails] || categoryDetails.Wants;
                  return(
                  <TableRow key={expense.id} className="border-slate-800">
                    <TableCell className="font-medium flex items-center">
                      <span className={details.color}>{details.icon}</span>
                      <span className="ml-2">{expense.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={'outline'}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDate(expense.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRequest(expense)}
                           className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete expense</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              expense from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
