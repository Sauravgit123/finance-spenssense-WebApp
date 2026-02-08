'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;
  public digest: string;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules: \n${JSON.stringify(
      {
        details: 'A request to Firestore was denied by security rules.',
        ...context,
      },
      null,
      2
    )}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    // This is to make the error visible in the Next.js overlay
    this.digest = `FIRESTORE_PERMISSION_ERROR: ${context.operation.toUpperCase()} on ${context.path}`;
  }
}
