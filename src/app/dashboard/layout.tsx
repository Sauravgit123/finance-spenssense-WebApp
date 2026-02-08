import { Header } from '@/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950">
      <Header />
      <main className="flex-1 relative">
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-teal-500/20 blur-3xl -z-0" />
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[50rem] h-[50rem] rounded-full bg-indigo-500/20 blur-3xl -z-0" />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
