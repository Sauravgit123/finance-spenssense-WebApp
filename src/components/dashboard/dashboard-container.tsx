'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { useAuth } from '@/firebase/auth-provider';
import { useFirestore } from '@/firebase/provider';
import type { Expense, UserData } from '@/lib/types';
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
  const { user, loading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  
  useEffect(() => {
    if (loading) return;
    if (!user) {
      // AuthProvider handles redirect
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const expensesQuery = query(expensesColRef, orderBy('createdAt', 'desc'));

    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserData;
        setUserData(data);
        if (!data.income || data.income === 0) {
          setIncomeModalOpen(true);
        }
      } else {
        // This case is now handled at signup, but kept as a fallback.
        const initialData = { 
          income: 0,
          displayName: user.displayName || 'New User',
          photoURL: user.photoURL || '',
        };
        setDoc(userDocRef, initialData).catch(serverError => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: initialData
          });
          errorEmitter.emit('permission-error', permissionError);
        });
        setUserData(initialData);
        setIncomeModalOpen(true);
      }
      setDataLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setDataLoading(false);
    });

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      setExpenses(expensesData);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
          path: expensesColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
      unsubscribeUser();
      unsubscribeExpenses();
    };
  }, [user, loading, router, db]);

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

  if (loading || dataLoading) {
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
          <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}!</p>
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
              color="hsl(var(--chart-1))"
            />
            <BudgetCategoryCard
              title="Wants"
              icon={<Sparkles className="h-5 w-5 text-violet-400" />}
              allocated={wantsTotal}
              spent={wantsSpent}
              color="hsl(var(--chart-2))"
            />
            <BudgetCategoryCard
              title="Savings"
              icon={<PiggyBank className="h-5 w-5 text-emerald-400" />}
              allocated={savingsTotal}
              spent={savingsSpent}
              color="hsl(var(--chart-3))"
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
