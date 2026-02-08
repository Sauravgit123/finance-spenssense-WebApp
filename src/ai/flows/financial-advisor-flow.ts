'use server';

/**
 * @fileOverview An AI-powered financial advisor flow.
 *
 * - getFinancialTip - A function that analyzes expenses and provides a financial tip.
 * - FinancialAdvisorInput - The input type for the getFinancialTip function.
 * - FinancialAdvisorOutput - The return type for the getFinancialTip function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExpenseInputSchema = z.object({
  name: z.string().describe('The name of the expense.'),
  amount: z.number().describe('The amount of the expense.'),
  category: z.enum(['Needs', 'Wants', 'Savings']).describe('The category of the expense.'),
});

const FinancialAdvisorInputSchema = z.object({
  expenses: z.array(ExpenseInputSchema).describe('A list of recent expenses.'),
  income: z.number().describe("The user's monthly income."),
});

const FinancialAdvisorOutputSchema = z.object({
  tip: z.string().describe('A concise financial tip based on the user\'s spending.'),
});

export type FinancialAdvisorInput = z.infer<typeof FinancialAdvisorInputSchema>;
export type FinancialAdvisorOutput = z.infer<typeof FinancialAdvisorOutputSchema>;


export async function getFinancialTip(input: FinancialAdvisorInput): Promise<FinancialAdvisorOutput> {
  return financialAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAdvisorPrompt',
  input: { schema: FinancialAdvisorInputSchema },
  output: { schema: FinancialAdvisorOutputSchema },
  prompt: `You are a friendly and insightful financial advisor named SpendSense. Your goal is to help the user manage their money better.

Analyze the following list of recent expenses and the user's monthly income.
- User's monthly income: \${{{income}}}
- Expenses:
{{#each expenses}}
  - {{name}}: \${{amount}} (Category: {{category}})
{{/each}}

Based on this data, provide one concise, actionable, and encouraging tip to help the user improve their spending habits or savings. Address the user directly. If there are no expenses, provide a general welcome tip about setting up their budget. Keep the tip to 2-3 sentences.
`,
});

const financialAdvisorFlow = ai.defineFlow(
  {
    name: 'financialAdvisorFlow',
    inputSchema: FinancialAdvisorInputSchema,
    outputSchema: FinancialAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
