import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfISOWeek, formatISO, parseISO } from "date-fns";

export type MetricKey =
  | "eggs_set"
  | "fertility_percent"
  | "hatch_percent"
  | "residue_percent"
  | "temperature_avg"
  | "humidity_avg";

export interface WeeklyDataPoint {
  unit_id: string;
  week_start: string; // YYYY-MM-DD (ISO week start)
  metrics: Record<MetricKey, number | null>;
}

interface UseUnitHistoryReturn {
  history: WeeklyDataPoint[];
  loading: boolean;
  error: string | null;
}

export const useUnitHistory = (
  unitIds: string[],
  weeksBack: number = 12
): UseUnitHistoryReturn => {
  const [history, setHistory] = useState<WeeklyDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - weeksBack * 7);
    return formatISO(startOfISOWeek(d), { representation: "date" });
  }, [weeksBack]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!unitIds || unitIds.length === 0) {
        setHistory([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // 1) Batches (eggs_set) by set_date
        const { data: batches, error: batchesError } = await supabase
          .from("batches")
          .select("id, unit_id, set_date, total_eggs_set")
          .in("unit_id", unitIds)
          .gte("set_date", startDate);
        if (batchesError) throw batchesError;

        const batchIds = (batches || []).map((b) => b.id);

        // 2) Fertility analysis (fertility_percent, hatch_percent)
        const { data: fert, error: fertError } = await supabase
          .from("fertility_analysis")
          .select("batch_id, analysis_date, fertility_percent, hatch_percent")
          .in("batch_id", batchIds);
        if (fertError) throw fertError;

        // 3) Residue analysis (residue_percent)
        const { data: residue, error: residueError } = await supabase
          .from("residue_analysis")
          .select("batch_id, analysis_date, residue_percent")
          .in("batch_id", batchIds);
        if (residueError) throw residueError;

        // 4) QA monitoring (temperature, humidity) by check_date
        const { data: qa, error: qaError } = await supabase
          .from("qa_monitoring")
          .select("batch_id, check_date, temperature, humidity")
          .in("batch_id", batchIds);
        if (qaError) throw qaError;

        // Helper maps
        const batchToUnit = new Map<string, string>();
        (batches || []).forEach((b: any) => batchToUnit.set(b.id, b.unit_id));

        type Agg = {
          eggs_set_sum: number;
          eggs_set_count: number;
          fertility_sum: number;
          fertility_count: number;
          hatch_sum: number;
          hatch_count: number;
          residue_sum: number;
          residue_count: number;
          temp_sum: number;
          temp_count: number;
          hum_sum: number;
          hum_count: number;
        };
        const agg = new Map<string, Agg>(); // key: unitId|weekStart

        const touch = (unitId: string, weekStart: string) => {
          const key = `${unitId}|${weekStart}`;
          if (!agg.has(key)) {
            agg.set(key, {
              eggs_set_sum: 0,
              eggs_set_count: 0,
              fertility_sum: 0,
              fertility_count: 0,
              hatch_sum: 0,
              hatch_count: 0,
              residue_sum: 0,
              residue_count: 0,
              temp_sum: 0,
              temp_count: 0,
              hum_sum: 0,
              hum_count: 0,
            });
          }
          return key;
        };

        // Aggregate batches
        (batches || []).forEach((b: any) => {
          const weekStart = formatISO(startOfISOWeek(parseISO(b.set_date)), {
            representation: "date",
          });
          const key = touch(b.unit_id, weekStart);
          const rec = agg.get(key)!;
          if (typeof b.total_eggs_set === "number") {
            rec.eggs_set_sum += b.total_eggs_set;
            rec.eggs_set_count += 1;
          }
        });

        // Aggregate fertility
        (fert || []).forEach((f: any) => {
          const unitId = batchToUnit.get(f.batch_id);
          if (!unitId) return;
          const weekStart = formatISO(startOfISOWeek(parseISO(f.analysis_date)), {
            representation: "date",
          });
          const key = touch(unitId, weekStart);
          const rec = agg.get(key)!;
          if (typeof f.fertility_percent === "number") {
            rec.fertility_sum += f.fertility_percent;
            rec.fertility_count += 1;
          }
          if (typeof f.hatch_percent === "number") {
            rec.hatch_sum += f.hatch_percent;
            rec.hatch_count += 1;
          }
        });

        // Aggregate residue
        (residue || []).forEach((r: any) => {
          const unitId = batchToUnit.get(r.batch_id);
          if (!unitId) return;
          const weekStart = formatISO(startOfISOWeek(parseISO(r.analysis_date)), {
            representation: "date",
          });
          const key = touch(unitId, weekStart);
          const rec = agg.get(key)!;
          if (typeof r.residue_percent === "number") {
            rec.residue_sum += r.residue_percent;
            rec.residue_count += 1;
          }
        });

        // Aggregate QA
        (qa || []).forEach((q: any) => {
          const unitId = batchToUnit.get(q.batch_id);
          if (!unitId) return;
          const weekStart = formatISO(startOfISOWeek(parseISO(q.check_date)), {
            representation: "date",
          });
          const key = touch(unitId, weekStart);
          const rec = agg.get(key)!;
          if (typeof q.temperature === "number") {
            rec.temp_sum += q.temperature;
            rec.temp_count += 1;
          }
          if (typeof q.humidity === "number") {
            rec.hum_sum += q.humidity;
            rec.hum_count += 1;
          }
        });

        // Build final history
        const result: WeeklyDataPoint[] = [];
        agg.forEach((v, key) => {
          const [unit_id, week_start] = key.split("|");
          result.push({
            unit_id,
            week_start,
            metrics: {
              eggs_set: v.eggs_set_count ? Number(v.eggs_set_sum) : null,
              fertility_percent: v.fertility_count ? v.fertility_sum / v.fertility_count : null,
              hatch_percent: v.hatch_count ? v.hatch_sum / v.hatch_count : null,
              residue_percent: v.residue_count ? v.residue_sum / v.residue_count : null,
              temperature_avg: v.temp_count ? v.temp_sum / v.temp_count : null,
              humidity_avg: v.hum_count ? v.hum_sum / v.hum_count : null,
            },
          });
        });

        // Sort by week then unit for consistency
        result.sort((a, b) => (a.week_start === b.week_start ? a.unit_id.localeCompare(b.unit_id) : a.week_start.localeCompare(b.week_start)));
        setHistory(result);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [unitIds, startDate]);

  return { history, loading, error };
};
