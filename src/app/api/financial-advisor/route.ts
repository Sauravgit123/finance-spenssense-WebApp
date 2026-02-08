import { NextResponse } from 'next/server';
import { financialAdvisorFlow } from '@/ai/flows/financial-advisor-flow';
import { z } from 'zod';

const ExpenseInputSchema = z.object({
  name: z.string(),
  amount: z.number(),
  category: z.enum(['Needs', 'Wants', 'Savings']),
});

const FinancialAdvisorInputSchema = z.object({
  expenses: z.array(ExpenseInputSchema),
  income: z.number(),
  query: z.string(),
});


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedInput = FinancialAdvisorInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const result = await financialAdvisorFlow(parsedInput.data);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('AI financial advisor API error:', error);
    // It's important to not leak internal error details to the client
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
