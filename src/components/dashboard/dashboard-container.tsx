'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore } from '@/firebase/provider';
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCategoryCard } from './budget-category-card';
import { AddExpenseForm } from './add-expense-form';
import { ExpenseList } from './expense-list';
import { Home, Sparkles, PiggyBank, Edit, DollarSign, CreditCard, WalletCards, BadgePercent } from 'lucide-react';
import { IncomeSetter } from './income-setter';
import { Button } from '../ui/button';
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
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      setExpensesLoading(false);
      return;
    }
    
    // Show income modal if it's not set
    if (!loading && userData && (!userData.income || userData.income === 0)) {
        setIncomeModalOpen(true);
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
  }, [user, db, loading, userData]);

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
        <Skeleton className="h-8 w-1/4 mb-6 bg-white/10" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Skeleton className="h-40 rounded-2xl bg-white/10" />
          <Skeleton className="h-40 rounded-2xl bg-white/10" />
          <Skeleton className="h-40 rounded-2xl bg-white/10" />
        </div>
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Skeleton className="h-64 rounded-2xl bg-white/10" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-64 rounded-2xl bg-white/10" />
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
        <div>
          <Button variant="outline" onClick={() => setIncomeModalOpen(true)}>
             <Edit className="mr-2 h-4 w-4" /> 
             Edit Income
          </Button>
        </div>
      </div>
      
      <IncomeSetter
        isOpen={isIncomeModalOpen}
        setIsOpen={setIncomeModalOpen}
        currentIncome={income}
      />
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-white/10 backdrop-blur-md border-transparent shadow-lg transition-all hover:scale-105 hover:shadow-xl rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(income)}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-transparent shadow-lg transition-all hover:scale-105 hover:shadow-xl rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(totalSpent)}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-transparent shadow-lg transition-all hover:scale-105 hover:shadow-xl rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <WalletCards className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${remainingIncome < 0 ? 'text-red-400' : ''}`}>{formatCurrency(remainingIncome)}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-transparent shadow-lg transition-all hover:scale-105 hover:shadow-xl rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                  <BadgePercent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{savingsRate.toFixed(0)}%</div>
                </CardContent>
              </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BudgetCategoryCard
              title="Needs"
              icon={<Home className="h-5 w-5 text-sky-400" />}
              allocated={needsTotal}
              spent={needsSpent}
              colorClass="bg-chart-1"
            />
            <BudgetCategoryCard
              title="Wants"
              icon={<Sparkles className="h-5 w-5 text-violet-400" />}
              allocated={wantsTotal}
              spent={wantsSpent}
              colorClass="bg-chart-2"
            />
            <BudgetCategoryCard
              title="Savings"
              icon={<PiggyBank className="h-5 w-5 text-emerald-400" />}
              allocated={savingsTotal}
              spent={savingsSpent}
              colorClass="bg-chart-3"
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
