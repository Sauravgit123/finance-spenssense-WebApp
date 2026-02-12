import { Header } from '@/components/header';
import { LiveBackground } from '@/components/live-background';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <LiveBackground />
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
