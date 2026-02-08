import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface BudgetCategoryCardProps {
  title: string;
  icon: React.ReactNode;
  allocated: number;
  spent: number;
  color: string;
}

export function BudgetCategoryCard({
  title,
  icon,
  allocated,
  spent,
  color,
}: BudgetCategoryCardProps) {
  const progressValue = allocated > 0 ? (spent / allocated) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const chartData = [
    { name: 'spent', value: progressValue },
    { name: 'remaining', value: 100 - progressValue }
  ];

  const COLORS = [color, 'hsl(var(--muted) / 0.2)'];

  return (
    <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-all hover:scale-105 hover:shadow-xl rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="relative h-28 w-28">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={45}
                        dataKey="value"
                        stroke="none"
                        startAngle={90}
                        endAngle={-270}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{Math.round(progressValue)}%</span>
            </div>
        </div>
        <div className="mt-4 text-center">
            <div className="text-lg font-bold">{formatCurrency(spent)}</div>
            <p className="text-xs text-muted-foreground">of {formatCurrency(allocated)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
