'use client';

import { LiveBackground } from '@/components/live-background';
import { SpendSenseLogo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <LiveBackground />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <div className="mb-8">
          <SpendSenseLogo />
        </div>
        {children}
      </div>
    </div>
  );
}
