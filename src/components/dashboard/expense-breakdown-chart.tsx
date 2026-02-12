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

// This shape is for the currently HOVERED segment. It's more prominent.
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}>
      {/* The main colored sector */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4} // A very subtle pop
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={8}
        className="stroke-background"
        strokeWidth={2}
      />
      {/* Text in the middle */}
       <text x={cx} y={cy - 12} textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" className="text-2xl font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central" fill={fill} className="text-lg font-semibold tracking-wider uppercase">
        {payload.category}
      </text>
    </g>
  );
};

// This shape is for the segments NOT being hovered. They are dimmed.
const renderInactiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                fillOpacity={0.4}
                cornerRadius={8}
                className="stroke-background/50"
                strokeWidth={1}
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
  
  // Reset to default active slice when mouse leaves the chart
  const onMouseLeave = React.useCallback(() => {
    setActiveIndex(0);
  }, [setActiveIndex]);

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
            onMouseLeave={onMouseLeave}
          >
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                inactiveShape={renderInactiveShape}
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
