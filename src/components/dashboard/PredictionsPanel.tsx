import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUnitHistory, MetricKey, WeeklyDataPoint } from "@/hooks/useUnitHistory";
import { usePredictions } from "@/hooks/usePredictions";
import { startOfISOWeek, formatISO, addWeeks } from "date-fns";
import { Calculator, CalendarDays, LineChart, Settings2 } from "lucide-react";

interface UnitItem {
  id: string;
  name: string;
}

const ALL_METRICS: { key: MetricKey; label: string }[] = [
  { key: "eggs_set", label: "Eggs Set" },
  { key: "fertility_percent", label: "Fertility %" },
  { key: "hatch_percent", label: "Hatch %" },
  { key: "residue_percent", label: "Residue %" },
  { key: "temperature_avg", label: "Avg Temp" },
  { key: "humidity_avg", label: "Avg Humidity" },
];

const PredictionsPanel: React.FC = () => {
  const { toast } = useToast();
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "eggs_set",
    "fertility_percent",
    "hatch_percent",
  ]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const selectedWeekStart = useMemo(
    () => formatISO(startOfISOWeek(selectedDate), { representation: "date" }),
    [selectedDate]
  );

  // Load units
  useEffect(() => {
    const loadUnits = async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load units", error);
        toast({
          title: "Unable to fetch units",
          description: "Please sign in or try again later.",
          variant: "destructive",
        });
        return;
      }

      setUnits(data || []);
      if ((data || []).length === 1) {
        setSelectedUnitIds([data![0].id]);
      }
    };

    loadUnits();
  }, [toast]);

  // History for last 12 weeks for selected units
  const { history, loading: historyLoading } = useUnitHistory(selectedUnitIds, 12);

  const { generatePredictions, predictions, insights, loading: predicting } = usePredictions();

  const onToggleUnit = (id: string, checked: boolean) => {
    setSelectedUnitIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((u) => u !== id)
    );
  };

  const onToggleMetric = (key: MetricKey, checked: boolean) => {
    setSelectedMetrics((prev) =>
      checked ? Array.from(new Set([...prev, key])) : prev.filter((m) => m !== key)
    );
  };

  const handleGenerate = async () => {
    if (selectedUnitIds.length === 0) {
      toast({ title: "Select at least one unit" });
      return;
    }
    if (selectedMetrics.length === 0) {
      toast({ title: "Select at least one metric" });
      return;
    }

    await generatePredictions({
      units: selectedUnitIds,
      weekStart: selectedWeekStart,
      metrics: selectedMetrics,
      history: history,
    });
  };

  const lastWeekStart = useMemo(
    () => formatISO(startOfISOWeek(addWeeks(selectedDate, -1)), { representation: "date" }),
    [selectedDate]
  );

  const lastWeekLookup = useMemo(() => {
    const map = new Map<string, WeeklyDataPoint>();
    history
      .filter((h) => h.week_start === lastWeekStart)
      .forEach((h) => {
        map.set(`${h.unit_id}`, h);
      });
    return map;
  }, [history, lastWeekStart]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Configure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-foreground mb-2">Units</div>
                <div className="rounded-md border p-3 max-h-48 overflow-auto">
                  {units.length === 0 && (
                    <div className="text-sm text-muted-foreground">No units found.</div>
                  )}
                  {units.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={selectedUnitIds.includes(u.id)}
                        onCheckedChange={(c) => onToggleUnit(u.id, Boolean(c))}
                        aria-label={`Select unit ${u.name}`}
                      />
                      <span className="text-sm text-foreground">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Week start
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="rounded-md border"
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Selected ISO week starts on {selectedWeekStart}
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm font-medium text-foreground mb-2">Metrics</div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_METRICS.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedMetrics.includes(m.key)}
                        onCheckedChange={(c) => onToggleMetric(m.key, Boolean(c))}
                        aria-label={`Select metric ${m.label}`}
                      />
                      <span className="text-sm text-foreground">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={historyLoading || predicting} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                {predicting ? "Calculating..." : "Run forecast"}
              </Button>
              <div className="text-xs text-muted-foreground">
                Calculates forecasts from your last 12 weeks of data.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" /> Forecast & insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {predicting && (
              <div className="text-sm text-muted-foreground">Crunching the numbers...</div>
            )}

            {!predicting && predictions && (
              <div className="space-y-6">
                {insights && insights.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-2">Insights</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {insights.map((i, idx) => (
                        <li key={idx}>{i}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Forecast for week starting {selectedWeekStart}
                  </h3>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Unit</th>
                          <th className="text-left p-2">Metric</th>
                          <th className="text-left p-2">Predicted</th>
                          <th className="text-left p-2">Last week</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(predictions).map(([unitId, metrics]) => (
                          Object.entries(metrics as Record<string, number | null>).map(([metric, value]) => (
                            <tr key={`${unitId}-${metric}`} className="border-t">
                              <td className="p-2">{units.find((u) => u.id === unitId)?.name || unitId}</td>
                              <td className="p-2">{ALL_METRICS.find((m) => m.key === metric)?.label || metric}</td>
                              <td className="p-2">{value ?? "-"}</td>
                              <td className="p-2">
                                {lastWeekLookup.get(unitId)?.metrics[metric as MetricKey] ?? "-"}
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!predicting && !predictions && (
              <div className="text-sm text-muted-foreground">
                Select units, a week, and metrics, then click "Generate predictions".
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default PredictionsPanel;
