'use server';

import { NextResponse } from 'next/server';
import { financialAdvisorFlow } from '@/ai/flows/financial-advisor-flow';
import { z } from 'zod';
import { admin } from '@/firebase/admin';
import type { Expense } from '@/lib/types';

const RequestSchema = z.object({
  query: z.string(),
});

export async function POST(request: Request) {
  // Check if Firebase Admin is initialized
  if (!admin.apps.length) {
    const errorMessage = 'AI assistant is not configured. The server is missing Firebase Admin credentials. Please check your .env.local file.';
    console.error(`FATAL: ${errorMessage}`);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }

  try {
    // 1. Authenticate the user and get their UID
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Securely fetch user data from Firestore on the server
    const userDocRef = admin.firestore().collection('users').doc(uid);
    const expensesColRef = userDocRef.collection('expenses');

    const [userDoc, expensesSnapshot] = await Promise.all([
      userDocRef.get(),
      expensesColRef.get(),
    ]);

    if (!userDoc.exists) {
        return NextResponse.json({ error: 'User data not found.' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const income = userData?.income || 0;
    
    // Convert Firestore timestamps to dates, then to the format AI expects
    const expenses = expensesSnapshot.docs.map(doc => {
        const data = doc.data() as Expense;
        return {
            name: data.name,
            amount: data.amount,
            category: data.category,
        };
    });

    // 3. Parse the user's query from the request body
    const body = await request.json();
    const parsedRequest = RequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json({ error: 'Invalid input: Missing query.' }, { status: 400 });
    }

    // 4. Call the AI flow with the securely fetched data
    const result = await financialAdvisorFlow({
        income,
        expenses,
        query: parsedRequest.data.query,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in financial-advisor API:", error);

    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return NextResponse.json({ error: 'Unauthorized. Invalid token.' }, { status: 401 });
    }
    
    // Check for common environment variable issues
    if (error.message?.includes('API key not found')) {
      const errorMessage = 'AI assistant is not configured. The server is missing the Gemini API key. Please check your .env.local file.';
      console.error(`FATAL: ${errorMessage}`);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please check the server logs for details.' },
      { status: 500 }
    );
  }
}
