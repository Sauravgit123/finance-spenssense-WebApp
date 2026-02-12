'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore } from '@/firebase/provider';
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCategoryCard } from './budget-category-card';
import { AddExpenseForm } from './add-expense-form';
import { ExpenseList } from './expense-list';
import { Home, Sparkles, PiggyBank, DollarSign, CreditCard, WalletCards, BadgePercent } from 'lucide-react';
import { ExpenseBreakdownChart } from './expense-breakdown-chart';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AIAdvisorCard } from './ai-advisor-card';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export function DashboardContainer() {
  const { user, userData, loading } = useAuth();
  const db = useFirestore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      setExpensesLoading(false);
      return;
    }

    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const expensesQuery = query(expensesColRef, orderBy('createdAt', 'desc'));

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      setExpenses(expensesData);
      setExpensesLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
          path: expensesColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setExpensesLoading(false);
    });

    return () => {
      unsubscribeExpenses();
    };
  }, [user, db]);

  const { needsTotal, wantsTotal, savingsTotal, needsSpent, wantsSpent, savingsSpent, totalSpent } = useMemo(() => {
    const income = userData?.income || 0;
    const needsTotal = income * 0.5;
    const wantsTotal = income * 0.3;
    const savingsTotal = income * 0.2;

    const needsSpent = expenses.filter(e => e.category === 'Needs').reduce((acc, e) => acc + e.amount, 0);
    const wantsSpent = expenses.filter(e => e.category === 'Wants').reduce((acc, e) => acc + e.amount, 0);
    const savingsSpent = expenses.filter(e => e.category === 'Savings').reduce((acc, e) => acc + e.amount, 0);
    const totalSpent = needsSpent + wantsSpent + savingsSpent;

    return { needsTotal, wantsTotal, savingsTotal, needsSpent, wantsSpent, savingsSpent, totalSpent };
  }, [userData, expenses]);

  if (loading || expensesLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-8 w-1/4 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3 space-y-8">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const income = userData?.income || 0;
  const remainingIncome = income - totalSpent;
  const savingsRate = income > 0 ? (savingsSpent / income) * 100 : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userData?.displayName || user?.email}!</p>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(income)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Balance</CardTitle>
                  <WalletCards className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${remainingIncome < 0 ? 'text-destructive' : ''}`}>{formatCurrency(remainingIncome)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                  <BadgePercent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{savingsRate.toFixed(0)}%</div>
                </CardContent>
              </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BudgetCategoryCard
              title="Needs"
              icon={<Home className="h-5 w-5 text-blue-500" />}
              allocated={needsTotal}
              spent={needsSpent}
              colorClass="bg-blue-500"
            />
            <BudgetCategoryCard
              title="Wants"
              icon={<Sparkles className="h-5 w-5 text-purple-500" />}
              allocated={wantsTotal}
              spent={wantsSpent}
              colorClass="bg-purple-500"
            />
            <BudgetCategoryCard
              title="Savings"
              icon={<PiggyBank className="h-5 w-5 text-green-500" />}
              allocated={savingsTotal}
              spent={savingsSpent}
              colorClass="bg-green-500"
            />
          </div>

          <ExpenseList expenses={expenses} />
        </div>

        <div className="space-y-8">
            <AIAdvisorCard expenses={expenses} income={income} />
            <AddExpenseForm />
            <ExpenseBreakdownChart expenses={expenses} />
        </div>
      </div>
    </div>
  );
}
