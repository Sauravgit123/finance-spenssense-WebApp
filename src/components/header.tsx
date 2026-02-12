'use client';

import Link from 'next/link';
import { SpendSenseLogo } from './logo';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-white/5 px-6 backdrop-blur-xl">
      <Link href="/dashboard" className="flex items-center gap-2 mr-auto">
        <SpendSenseLogo />
      </Link>
    </header>
  );
}
