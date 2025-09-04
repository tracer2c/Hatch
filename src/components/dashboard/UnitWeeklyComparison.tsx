import React, { useMemo, useState } from "react";
import { startOfWeek, endOfWeek, format, addWeeks } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useUnitWeeklyMetrics, MetricKey } from "@/hooks/useUnitWeeklyMetrics";
import { useToast } from "@/hooks/use-toast";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

const metricOptions: { key: MetricKey; label: string }[] = [
  { key: "eggs_set", label: "Eggs Set" },
  { key: "fertility_pct", label: "Fertility %" },
  { key: "hatch_pct", label: "Hatch %" },
  { key: "residue_pct", label: "Residue %" },
  { key: "avg_temp", label: "Avg Temperature" },
  { key: "avg_humidity", label: "Avg Humidity" },
];

const UnitWeeklyComparison: React.FC = () => {
  const { toast } = useToast();
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("eggs_set");

  const weekStart = useMemo(() => startOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate]);
  const weekEnd = useMemo(() => endOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate]);

  // Load available units
  const { data: units, isLoading: unitsLoading, error: unitsError } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id,name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  // Initialize selected units to all when loaded
  React.useEffect(() => {
    if (!unitsLoading && units && units.length > 0 && selectedUnitIds.length === 0) {
      setSelectedUnitIds(units.map((u) => u.id));
    }
  }, [unitsLoading, units, selectedUnitIds.length]);

  const { data: weeklyData, isLoading: metricsLoading, error: metricsError } = useUnitWeeklyMetrics({
    unitIds: selectedUnitIds,
    weekStart,
    weekEnd,
  });

  React.useEffect(() => {
    if (unitsError) {
      toast({ title: "Error", description: "Failed to load units", variant: "destructive" });
    }
    if (metricsError) {
      toast({ title: "Error", description: "Failed to load weekly metrics", variant: "destructive" });
    }
  }, [unitsError, metricsError, toast]);

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")} (${format(anchorDate, "'W'II")})`;

  const chartData = useMemo(() => {
    if (!weeklyData) return [] as { unitName: string; value: number }[];
    return weeklyData.map((r) => ({
      unitName: r.unitName,
      value:
        selectedMetric === "eggs_set"
          ? r.eggs_set
          : selectedMetric === "fertility_pct"
          ? r.fertility_pct ?? 0
          : selectedMetric === "hatch_pct"
          ? r.hatch_pct ?? 0
          : selectedMetric === "residue_pct"
          ? r.residue_pct ?? 0
          : selectedMetric === "avg_temp"
          ? r.avg_temp ?? 0
          : r.avg_humidity ?? 0,
    }));
  }, [weeklyData, selectedMetric]);

  const isPercent = selectedMetric === "fertility_pct" || selectedMetric === "hatch_pct" || selectedMetric === "residue_pct";

  const chartId = "unit-weekly-chart";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAnchorDate((d) => addWeeks(d, -1))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[220px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {weekLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={anchorDate}
                onSelect={(d) => d && setAnchorDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="secondary" size="sm" onClick={() => setAnchorDate((d) => addWeeks(d, 1))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMetric} onValueChange={(v: MetricKey) => setSelectedMetric(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {units && units.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[180px]">
                  Compare Units ({selectedUnitIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Select units</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {units.map((u) => {
                  const checked = selectedUnitIds.includes(u.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={u.id}
                      checked={checked}
                      onCheckedChange={(c) => {
                        setSelectedUnitIds((prev) =>
                          c ? Array.from(new Set([...prev, u.id])) : prev.filter((id) => id !== u.id)
                        );
                      }}
                    >
                      {u.name}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" disabled>
              {unitsLoading ? "Loading units..." : units && units[0] ? units[0].name : "No units"}
            </Button>
          )}

          <ChartDownloadButton chartId={chartId} filename={`unit-weekly-${format(weekStart, "yyyy-MM-dd")}.png`} />
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-medium text-foreground">Unit Weekly Comparison — {metricOptions.find(m => m.key === selectedMetric)?.label}</h3>
        </div>
        <div id={chartId} className="h-[340px]">
          {metricsLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart…</div>
          ) : !chartData.length ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data for selected week.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                <XAxis dataKey="unitName" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tickFormatter={(v) => (isPercent ? `${Math.round(Number(v))}%` : `${Math.round(Number(v))}`)}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  formatter={(value: any) =>
                    isPercent ? [`${Number(value).toFixed(1)}%`, "Value"] : [Number(value).toFixed(0), "Value"]
                  }
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default UnitWeeklyComparison;
