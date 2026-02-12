'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type Expense } from '@/lib/types';
import {
  ChartContainer,
} from "@/components/ui/chart";

const chartConfig = {
  Needs: {
    label: "Needs",
    color: "hsl(var(--chart-1))",
  },
  Wants: {
    label: "Wants",
    color: "hsl(var(--chart-2))",
  },
  Savings: {
    label: "Savings",
    color: "hsl(var(--chart-3))",
  },
} satisfies React.ComponentProps<typeof ChartContainer>["config"];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// A simple, professional tooltip to show details on hover.
const ProfessionalTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
           <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.payload.fill }}/>
           <p className="font-bold text-foreground">
            {data.name}
          </p>
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
};


interface ExpenseBreakdownChartProps {
  expenses: Expense[];
}

export function ExpenseBreakdownChart({ expenses }: ExpenseBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const chartData = React.useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return [];
    }

    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(categoryTotals).map(([category, total]) => ({
      category: category as keyof typeof chartConfig,
      total: total,
      fill: chartConfig[category as keyof typeof chartConfig].color,
    }));
  }, [expenses]);
  
  const onPieEnter = React.useCallback(
    (_: any, index: number) => {
      setActiveIndex(index);
    },
    [setActiveIndex]
  );
  
  const onPieLeave = React.useCallback(
    () => {
      setActiveIndex(null);
    },
    [setActiveIndex]
  );

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>A simple and professional view of your spending.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={<ProfessionalTooltip />}
              />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="category"
                innerRadius={70}
                outerRadius={90}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                 {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill} 
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    stroke={activeIndex === index ? entry.fill : 'hsl(var(--card))'}
                    strokeWidth={activeIndex === index ? 2 : 1}
                  />
                ))}
              </Pie>
              <Legend
                content={({ payload }) => (
                  <div className="flex items-center justify-center gap-4 pt-4 text-sm">
                    {payload?.map((entry, index) => (
                      <div
                        key={`item-${index}`}
                        onMouseEnter={() => onPieEnter(entry, index)}
                        onMouseLeave={onPieLeave}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span
                          className="text-muted-foreground transition-opacity"
                          style={{ opacity: activeIndex === null || activeIndex === index ? 1 : 0.5 }}
                        >
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[290px] w-full items-center justify-center">
            <p className="text-muted-foreground">No expense data to display.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
