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
import { Home, Sparkles, PiggyBank, DollarSign, CreditCard, WalletCards, BadgePercent, LayoutGrid, List, Bot } from 'lucide-react';
import { ExpenseBreakdownChart } from './expense-breakdown-chart';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AIAdvisorCard } from './ai-advisor-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SetIncomeCard } from './set-income-card';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export function DashboardContainer() {
  const { user, userData, loading, logout } = useAuth();
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
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  const income = userData?.income || 0;

  if (income === 0) {
    return <SetIncomeCard />;
  }

  const remainingIncome = income - totalSpent;
  const savingsRate = income > 0 ? (savingsSpent / income) * 100 : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userData?.displayName || user?.email}!</p>
        </div>
      </div>
      
       <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 glassmorphism p-2 h-auto">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <List className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="advisor" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Advisor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="glassmorphism transition-all duration-200 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(income)}</div>
                </CardContent>
              </Card>
              <Card className="glassmorphism transition-all duration-200 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                </CardContent>
              </Card>
              <Card className="glassmorphism transition-all duration-200 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Balance</CardTitle>
                  <WalletCards className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${remainingIncome < 0 ? 'text-destructive' : ''}`}>{formatCurrency(remainingIncome)}</div>
                </CardContent>
              </Card>
              <Card className="glassmorphism transition-all duration-200 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                  <BadgePercent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{savingsRate.toFixed(0)}%</div>
                </CardContent>
              </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <BudgetCategoryCard
                title="Needs"
                icon={<Home className="h-5 w-5 text-chart-1" />}
                allocated={needsTotal}
                spent={needsSpent}
                colorClass="bg-chart-1"
              />
              <BudgetCategoryCard
                title="Wants"
                icon={<Sparkles className="h-5 w-5 text-chart-2" />}
                allocated={wantsTotal}
                spent={wantsSpent}
                colorClass="bg-chart-2"
              />
              <BudgetCategoryCard
                title="Savings"
                icon={<PiggyBank className="h-5 w-5 text-chart-3" />}
                allocated={savingsTotal}
                spent={savingsSpent}
                colorClass="bg-chart-3"
              />
            </div>
            
            <ExpenseBreakdownChart expenses={expenses} />
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-8">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-3">
                <ExpenseList expenses={expenses} />
              </div>
              <div className="md:col-span-2">
                <AddExpenseForm />
              </div>
            </div>
        </TabsContent>
        
        <TabsContent value="advisor">
            <AIAdvisorCard expenses={expenses} income={income} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
