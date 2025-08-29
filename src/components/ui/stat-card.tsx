import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trendLabel?: string;
  trendDirection?: "up" | "down" | null;
  sparklineData?: number[];
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trendLabel, trendDirection = null, sparklineData, className }) => {
  const data = React.useMemo(() =>
    (sparklineData || []).map((v, i) => ({ i, v })),
  [sparklineData]);

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-card-foreground">{value}</div>
        {trendLabel && (
          <p
            className={cn(
              "text-xs flex items-center mt-1",
              trendDirection === "up" && "text-emerald-600",
              trendDirection === "down" && "text-destructive",
              trendDirection === null && "text-muted-foreground"
            )}
          >
            {trendDirection === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
            {trendDirection === "down" && <TrendingDown className="h-3 w-3 mr-1" />}
            {trendLabel}
          </p>
        )}
        {data.length > 1 && (
          <div className="mt-3 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

