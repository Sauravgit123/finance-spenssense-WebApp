'use client';

import { SpendSenseLogo } from "@/components/logo";
import { LiveBackground } from "@/components/live-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      <LiveBackground />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <div className="mb-8">
          <SpendSenseLogo />
        </div>
        {children}
      </div>
    </main>
  );
}
