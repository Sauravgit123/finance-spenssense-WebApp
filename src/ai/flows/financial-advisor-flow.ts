'use server';

/**
 * @fileOverview An AI-powered financial advisor chat flow.
 *
 * This file defines the Genkit flow for the financial advisor.
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
  query: z.string().describe("The user's financial question."),
});

const FinancialAdvisorOutputSchema = z.object({
  answer: z.string().describe('A concise and helpful answer to the user\'s question based on their spending.'),
});

const financialAdvisorPrompt = ai.definePrompt({
  name: 'financialAdvisorPrompt',
  input: { schema: FinancialAdvisorInputSchema },
  output: { schema: FinancialAdvisorOutputSchema },
  prompt: `You are SpendSense, a friendly and insightful financial advisor. Your goal is to help the user manage their money better by answering their questions.

Analyze the following financial data:
- User's monthly income: \${{{income}}}
- Recent Expenses:
{{#each expenses}}
  - {{name}}: \${{amount}} (Category: {{category}})
{{/each}}

Based on this data, answer the user's question clearly and concisely. Address the user directly in a helpful and encouraging tone. If the question is not related to finance, gently guide them back to financial topics.

User's Question: "{{query}}"
`,
});

export const financialAdvisorFlow = ai.defineFlow(
  {
    name: 'financialAdvisorFlow',
    inputSchema: FinancialAdvisorInputSchema,
    outputSchema: FinancialAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await financialAdvisorPrompt(input);
    return output!;
  }
);
