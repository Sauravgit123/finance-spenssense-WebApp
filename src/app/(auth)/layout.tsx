'use client';

import { SpendSenseLogo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <div className="flex flex-col items-center justify-center w-full">
        <div className="mb-8">
          <SpendSenseLogo />
        </div>
        {children}
      </div>
    </main>
  );
}
