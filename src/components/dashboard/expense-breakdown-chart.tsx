'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type Expense } from '@/lib/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // Make the hovered segment "pop out"
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={8}
        className="stroke-background"
        strokeWidth={3}
      />
       <text x={cx} y={cy - 15} textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" className="text-xl font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="central" fill={fill} className="text-lg font-semibold">
        {payload.category}
      </text>
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
      category: category,
      total: total,
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
                data={chartData}
                dataKey="total"
                nameKey="category"
                innerRadius={70}
                outerRadius={90}
                cornerRadius={8}
                paddingAngle={5}
                onMouseEnter={onPieEnter}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={`var(--color-${entry.category})`}
                    className="stroke-background"
                    strokeWidth={3}
                  />
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
