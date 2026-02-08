import { SpendSenseLogo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[60rem] h-[60rem] rounded-full bg-teal-500/30 blur-3xl -z-0 animate-float-1" />
      <div className="absolute bottom-0 right-0 w-[60rem] h-[60rem] rounded-full bg-indigo-500/30 blur-3xl -z-0 animate-float-2" />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <div className="mb-8">
          <SpendSenseLogo />
        </div>
        {children}
      </div>
    </main>
  );
}
