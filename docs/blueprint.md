# **App Name**: BudgetFlow

## Core Features:

- Firebase Authentication: Secure user sign-up and login using email and password via Firebase.
- Income Input: Input field for users to set their total monthly income. Saved to Firestore.
- Automated Budget Calculation: Automatically calculates and displays budget allocations for Needs (50%), Wants (30%), and Savings (20%) based on income. Values persisted to Firestore.
- Expense Tracking: Form to input expense details including name, amount, and category (Needs, Wants, Savings). Saved to Firestore.
- Real-time Progress Visualization: Progress bars for each category to visually represent how much of the allocated budget has been spent. Reflects Firestore data in real time.

## Style Guidelines:

- Primary color: Deep indigo (#3F51B5) to evoke trust and financial stability.
- Background color: Light grayish-blue (#E8EAF6), a desaturated variant of the primary, for a clean and calming backdrop.
- Accent color: Vivid blue (#2962FF) for interactive elements and calls to action, providing a clear contrast.
- Body and headline font: 'Inter', a sans-serif font that is easy to read and modern, for both body and headlines.
- Modern Fintech design with dark mode support, rounded corners, and clear typography.
- Minimalist icons to represent Needs, Wants, and Savings categories.