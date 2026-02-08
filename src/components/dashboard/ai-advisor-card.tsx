'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles } from 'lucide-react';
import { getFinancialTip } from '@/ai/flows/financial-advisor-flow';
import type { Expense } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface AIAdvisorCardProps {
  expenses: Expense[];
  income: number;
}

export function AIAdvisorCard({ expenses, income }: AIAdvisorCardProps) {
  const [tip, setTip] = useState<string>('Click the button to get a personalized financial tip based on your spending!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetTip = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const expenseDataForAI = expenses.map(({ name, amount, category }) => ({
        name,
        amount,
        category,
      }));

      const result = await getFinancialTip({ expenses: expenseDataForAI, income });
      setTip(result.tip);
    } catch (e: any) {
      console.error(e);
      if (e.message && (e.message.includes('API key') || e.message.includes('permission'))) {
        setError('Your Gemini API key is missing or invalid. Please add it to your .env file to use the AI advisor.');
      } else {
        setError('Sorry, I couldn\'t generate a tip right now. Please try again later.');
      }
      setTip('Click the button to get a personalized financial tip based on your spending!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-violet-600/20 to-sky-500/20 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 text-yellow-300" />
          <CardTitle className="text-white">AI Financial Advisor</CardTitle>
        </div>
        <CardDescription className="text-slate-300">Your personal guide to smart spending.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="space-y-2 min-h-[60px] flex flex-col justify-center">
                <Skeleton className="h-4 w-full bg-white/20" />
                <Skeleton className="h-4 w-full bg-white/20" />
                <Skeleton className="h-4 w-3/4 bg-white/20" />
            </div>
        ) : (
            <p className="text-sm text-slate-100 min-h-[60px]">
                {error || tip}
            </p>
        )}
        
        <Button 
          onClick={handleGetTip} 
          disabled={isLoading} 
          className="w-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isLoading ? 'Generating Tip...' : 'Get Smart Tip'}
        </Button>
      </CardContent>
    </Card>
  );
}
