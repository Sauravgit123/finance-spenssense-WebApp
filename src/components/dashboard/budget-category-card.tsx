'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BudgetCategoryCardProps {
  title: string;
  icon: React.ReactNode;
  allocated: number;
  spent: number;
  colorClass: string;
  currency: string;
}

export function BudgetCategoryCard({
  title,
  icon,
  allocated,
  spent,
  colorClass,
  currency,
}: BudgetCategoryCardProps) {
  const [progress, setProgress] = useState(0);
  
  const rawProgressValue = allocated > 0 ? (spent / allocated) * 100 : 0;
  const displayProgress = Math.min(rawProgressValue, 100);

  useEffect(() => {
    // Animate the progress bar on mount and when value changes
    const timer = setTimeout(() => setProgress(displayProgress), 100);
    return () => clearTimeout(timer);
  }, [displayProgress]);

  const isOverBudget = rawProgressValue > 100;

  return (
    <Card className="glassmorphism transition-all duration-200 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={cn("text-2xl font-bold", isOverBudget && "text-destructive")}>{formatCurrency(spent, currency)}</div>
        <p className="text-xs text-muted-foreground">
          of {formatCurrency(allocated, currency)} budget
        </p>
        <Progress value={progress} indicatorClassName={cn(isOverBudget ? 'bg-destructive' : colorClass)} className="mt-4 h-2" />
        <div className="flex justify-between text-xs font-medium text-muted-foreground mt-1">
           {isOverBudget ? (
            <span className="font-bold text-destructive">{formatCurrency(spent - allocated, currency)} Over Budget</span>
           ) : (
            <>
              <span>{Math.round(rawProgressValue)}% Used</span>
              <span>{formatCurrency(allocated - spent, currency)} Left</span>
            </>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
