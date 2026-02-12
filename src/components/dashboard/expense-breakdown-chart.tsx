'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type Expense } from '@/lib/types';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
} satisfies React.ComponentProps<typeof ChartContainer>["config"]

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// This shape is for the currently HOVERED segment.
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <text x={cx} y={cy - 15} textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" className="text-2xl font-bold">
        {formatCurrency(payload.total)}
      </text>
      <text x={cx} y={cy + 5} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-sm">
        {`${(percent * 100).toFixed(0)}% of total`}
      </text>
      <text x={cx} y={cy + 25} textAnchor="middle" fill={fill} className="text-lg font-semibold">
        {payload.category}
      </text>
       <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 2} // Make it pop out a bit
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={'hsl(var(--card))'}
        strokeWidth={3}
      />
    </g>
  );
};


interface ExpenseBreakdownChartProps {
  expenses: Expense[];
}

export function ExpenseBreakdownChart({ expenses }: ExpenseBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);

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
      fill: `var(--color-${category})`
    }));
  }, [expenses]);
  
  const onPieEnter = React.useCallback(
    (_: any, index: number) => {
      setActiveIndex(index);
    },
    [setActiveIndex]
  );

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>Hover over a segment for details.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                inactiveShape={(props) => <Sector {...props} opacity={0.4} />}
                data={chartData}
                dataKey="total"
                nameKey="category"
                innerRadius={70}
                outerRadius={90}
                onMouseEnter={onPieEnter}
              >
                 {chartData.map((entry) => (
                  <Cell key={`cell-${entry.category}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="category" />}
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
