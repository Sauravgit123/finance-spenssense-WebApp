import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BudgetCategoryCardProps {
  title: string;
  icon: React.ReactNode;
  percentage: number;
  allocated: number;
  spent: number;
}

export function BudgetCategoryCard({
  title,
  icon,
  percentage,
  allocated,
  spent,
}: BudgetCategoryCardProps) {
  const progressValue = allocated > 0 ? (spent / allocated) * 100 : 0;
  const remaining = allocated - spent;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title} ({percentage}%)</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(allocated)}</div>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(spent)} spent
        </p>
        <Progress value={progressValue} className="mt-4" />
        <p className="text-xs text-muted-foreground mt-2">
          {formatCurrency(remaining)} remaining
        </p>
      </CardContent>
    </Card>
  );
}
