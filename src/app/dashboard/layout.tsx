import { Header } from '@/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[60rem] h-[60rem] rounded-full bg-teal-500/30 blur-2xl -z-0 animate-[float-1]" />
        <div className="absolute bottom-0 right-0 w-[60rem] h-[60rem] rounded-full bg-indigo-500/30 blur-2xl -z-0 animate-[float-2]" />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
