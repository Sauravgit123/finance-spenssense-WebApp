'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

interface AIAdvisorCardProps {
  expenses: Expense[];
  income: number;
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export function AIAdvisorCard({ expenses, income }: AIAdvisorCardProps) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Welcome! Ask me anything about your finances.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const expenseDataForAI = expenses.map(({ name, amount, category }) => ({
        name,
        amount,
        category,
      }));

      const response = await fetch('/api/financial-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenses: expenseDataForAI,
          income,
          query: currentInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorData.error || 'Failed to get a response from the server.');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }
      
      const aiMessage: Message = { sender: 'ai', text: result.answer };
      setMessages(prev => [...prev, aiMessage]);

    } catch (e: any) {
      console.error("AI Advisor Error:", e);
      const errorMessage = 'Sorry, I couldn\'t generate a response right now. Please try again later.';
      
      setMessages(prev => prev.filter(msg => msg !== userMessage));
      setError(errorMessage);
      setInput(currentInput); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-violet-600/20 to-sky-500/20 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl flex flex-col h-[550px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-yellow-300" />
          <CardTitle className="text-white">AI Financial Chat</CardTitle>
        </div>
        <CardDescription className="text-slate-300">Ask me anything about your spending.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4">
            {messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                    {message.sender === 'ai' && (
                        <Avatar className="w-8 h-8 border border-yellow-300/50">
                            <AvatarFallback className="bg-transparent">
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                            </AvatarFallback>
                        </Avatar>
                    )}
                    <div className={`rounded-2xl p-3 max-w-[80%] text-sm ${message.sender === 'user' ? 'bg-white/20 text-white rounded-br-none' : 'bg-black/20 text-slate-200 rounded-bl-none'}`}>
                        <p>{message.text}</p>
                    </div>
                     {message.sender === 'user' && (
                        <Avatar className="w-8 h-8">
                             <AvatarFallback>
                                <User className="w-5 h-5" />
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 border border-yellow-300/50">
                        <AvatarFallback className="bg-transparent">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl p-3 max-w-[80%] text-sm bg-black/20 rounded-bl-none">
                        <div className="flex gap-1.5">
                            <Skeleton className="h-3 w-3 rounded-full bg-white/40 animate-pulse" />
                            <Skeleton className="h-3 w-3 rounded-full bg-white/40 animate-pulse delay-150" />
                            <Skeleton className="h-3 w-3 rounded-full bg-white/40 animate-pulse delay-300" />
                        </div>
                    </div>
                </div>
            )}
             {error && (
                <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 border border-red-400/50">
                         <AvatarFallback className="bg-transparent">
                            <Sparkles className="w-5 h-5 text-red-400" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl p-3 max-w-[80%] text-sm bg-red-900/30 text-red-300 rounded-bl-none">
                        <p>{error}</p>
                    </div>
                </div>
            )}
            </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-4 border-t border-white/10">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="e.g., Where can I save money?"
            className="bg-white/10 border-white/20 placeholder:text-slate-400"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading} className="bg-white/10 hover:bg-white/20 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
