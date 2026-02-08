import { NextResponse } from 'next/server';
import { financialAdvisorFlow } from '@/ai/flows/financial-advisor-flow';
import { z } from 'zod';

// This file is kept for backward compatibility or other AI routes,
// but the primary financial advisor logic is now in /api/financial-advisor.
// You can add other general-purpose AI routes here.

export async function GET() {
  return NextResponse.json({ message: 'GenAI API is active.' });
}
