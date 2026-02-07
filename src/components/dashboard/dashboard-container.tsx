'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import type { Expense, UserData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCategoryCard } from './budget-category-card';
import { AddExpenseForm } from './add-expense-form';
import { ExpenseList } from './expense-list';
import { Home, Sparkles, PiggyBank, Edit } from 'lucide-react';
import { IncomeSetter } from './income-setter';
import { Button } from '../ui/button';

export function DashboardContainer() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
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
        // Create user document if it doesn't exist
        setDoc(userDocRef, { income: 0 });
        setUserData({ income: 0 });
        setIncomeModalOpen(true);
      }
      setDataLoading(false);
    });

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      setExpenses(expensesData);
    });

    return () => {
      unsubscribeUser();
      unsubscribeExpenses();
    };
  }, [user, loading, router]);

  const { needsTotal, wantsTotal, savingsTotal, needsSpent, wantsSpent, savingsSpent } = useMemo(() => {
    const income = userData?.income || 0;
    const needsTotal = income * 0.5;
    const wantsTotal = income * 0.3;
    const savingsTotal = income * 0.2;

    const needsSpent = expenses.filter(e => e.category === 'Needs').reduce((acc, e) => acc + e.amount, 0);
    const wantsSpent = expenses.filter(e => e.category === 'Wants').reduce((acc, e) => acc + e.amount, 0);
    const savingsSpent = expenses.filter(e => e.category === 'Savings').reduce((acc, e) => acc + e.amount, 0);

    return { needsTotal, wantsTotal, savingsTotal, needsSpent, wantsSpent, savingsSpent };
  }, [userData, expenses]);

  if (loading || dataLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-8 w-1/4 mb-6" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const income = userData?.income || 0;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email}!</p>
        </div>
        <div>
          <Button variant="outline" onClick={() => setIncomeModalOpen(true)}>
             <Edit className="mr-2 h-4 w-4" /> 
             {`Income: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(income)}`}
          </Button>
        </div>
      </div>
      
      <IncomeSetter
        isOpen={isIncomeModalOpen}
        setIsOpen={setIncomeModalOpen}
        currentIncome={income}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <BudgetCategoryCard
          title="Needs"
          icon={<Home className="h-6 w-6" />}
          percentage={50}
          allocated={needsTotal}
          spent={needsSpent}
        />
        <BudgetCategoryCard
          title="Wants"
          icon={<Sparkles className="h-6 w-6" />}
          percentage={30}
          allocated={wantsTotal}
          spent={wantsSpent}
        />
        <BudgetCategoryCard
          title="Savings"
          icon={<PiggyBank className="h-6 w-6" />}
          percentage={20}
          allocated={savingsTotal}
          spent={savingsSpent}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <AddExpenseForm />
        </div>
        <div className="md:col-span-3">
          <ExpenseList expenses={expenses} />
        </div>
      </div>
    </div>
  );
}
