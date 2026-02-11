import { CircleDollarSign } from 'lucide-react';

export function SpendSenseLogo() {
  return (
    <div className="flex items-center gap-2">
      <CircleDollarSign className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold text-foreground">SpendSense</h1>
    </div>
  );
}
