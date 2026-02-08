import { CircleDollarSign } from 'lucide-react';

export function SpendSenseLogo() {
  return (
    <div className="flex items-center gap-4 drop-shadow-[0_0_10px_hsl(var(--primary))]">
      <CircleDollarSign className="h-12 w-12 text-primary" />
      <h1 className="text-4xl font-bold text-foreground">SpendSense</h1>
    </div>
  );
}
