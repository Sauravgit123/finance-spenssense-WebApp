import { SpendSenseLogo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-teal-500/20 blur-3xl -z-0" />
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[50rem] h-[50rem] rounded-full bg-indigo-500/20 blur-3xl -z-0" />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <div className="mb-8">
          <SpendSenseLogo />
        </div>
        {children}
      </div>
    </main>
  );
}
