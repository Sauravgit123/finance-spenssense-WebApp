'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase/auth-provider';
import { SpendSenseLogo } from './logo';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout, loading } = useAuth();

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      const names = name.split(' ');
      if (names.length > 1 && names[names.length - 1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-white/10 bg-slate-950/80 px-4 shadow-md backdrop-blur-sm md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <SpendSenseLogo />
      </Link>
      <div className="ml-auto">
        {loading ? (
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                  <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900/80 backdrop-blur-md border-white/20">
              <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
