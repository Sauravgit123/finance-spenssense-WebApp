import { Header } from '@/components/header';
import { LiveBackground } from '@/components/live-background';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        <LiveBackground />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
