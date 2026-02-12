'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/firebase/auth-provider';

interface AIAdvisorCardProps {
  expenses: Expense[]; // This is kept for potential future client-side use, but not sent to the API
  income: number; // This is kept for potential future client-side use, but not sent to the API
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
    isError?: boolean;
}

export function AIAdvisorCard({ expenses, income }: AIAdvisorCardProps) {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Welcome! Ask me anything about your finances.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/financial-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: currentInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }
      
      const aiMessage: Message = { sender: 'ai', text: result.answer };
      setMessages(prev => [...prev, aiMessage]);

    } catch (e: any) {
      const genericError = 'Sorry, I couldn\'t generate a response right now. Please try again later.';
      let displayMessage = genericError;

      if (e.message?.includes('AI assistant is not configured')) {
        displayMessage = `The AI Assistant is not fully set up for this environment. This is expected during local development.\n\nTo make it work, it needs special API keys to connect to Firebase and Google AI. When you publish your app, you'll add these keys to your hosting provider's settings.`;
      } else if (e.message) {
        displayMessage = e.message;
      }
      
      const aiErrorMessage: Message = { sender: 'ai', text: displayMessage, isError: true };
      setMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glassmorphism flex flex-col h-[550px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle>AI Financial Chat</CardTitle>
        </div>
        <CardDescription>Ask me anything about your spending.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4">
            {messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                    {message.sender === 'ai' && (
                        <Avatar className={`w-8 h-8 border ${message.isError ? 'border-destructive' : ''}`}>
                            <AvatarFallback className="bg-transparent">
                                <Sparkles className={`w-5 h-5 ${message.isError ? 'text-destructive' : 'text-primary'}`} />
                            </AvatarFallback>
                        </Avatar>
                    )}
                    <div className={`rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : (message.isError ? 'bg-destructive/10 text-destructive' : 'bg-muted')}`}>
                        <p>{message.text}</p>
                    </div>
                     {message.sender === 'user' && (
                        <Avatar className="w-8 h-8">
                             <AvatarImage src={userData?.photoURL || user?.photoURL || undefined} />
                             <AvatarFallback>
                                <User className="w-5 h-5" />
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 border">
                        <AvatarFallback className="bg-transparent">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg p-3 max-w-[80%] text-sm bg-muted">
                        <div className="flex gap-1.5 items-center">
                            <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                            <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse delay-150" />
                            <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse delay-300" />
                        </div>
                    </div>
                </div>
            )}
            </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-4 border-t border-slate-700">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            placeholder="e.g., Where can I save money?"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !user} variant="outline" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
