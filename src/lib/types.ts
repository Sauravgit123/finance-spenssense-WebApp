import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface User extends FirebaseUser {}

export type ExpenseCategory = 'Needs' | 'Wants' | 'Savings';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  createdAt: Timestamp;
}

export interface UserData {
  income: number;
  displayName?: string;
}
