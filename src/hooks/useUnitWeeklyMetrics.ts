import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MetricKey =
  | "eggs_set"
  | "fertility_pct"
  | "hatch_pct"
  | "residue_pct"
  | "avg_temp"
  | "avg_humidity";

export interface WeeklyMetricsRow {
  unitId: string;
  unitName: string;
  eggs_set: number;
  fertility_pct: number | null;
  hatch_pct: number | null;
  residue_pct: number | null;
  avg_temp: number | null;
  avg_humidity: number | null;
}

interface UseUnitWeeklyMetricsParams {
  unitIds: string[];
  weekStart: Date;
  weekEnd: Date;
}

export const useUnitWeeklyMetrics = ({
  unitIds,
  weekStart,
  weekEnd,
}: UseUnitWeeklyMetricsParams) => {
  return useQuery({
    queryKey: [
      "unit-weekly-metrics",
      unitIds.sort().join(","),
      weekStart.toISOString(),
      weekEnd.toISOString(),
    ],
    enabled: unitIds.length > 0,
    queryFn: async (): Promise<WeeklyMetricsRow[]> => {
      // 1) Load selected units (names)
      const { data: units, error: unitsErr } = await supabase
        .from("units")
        .select("id,name")
        .in("id", unitIds);
      if (unitsErr) throw unitsErr;

      const startStr = weekStart.toISOString().slice(0, 10);
      const endStr = weekEnd.toISOString().slice(0, 10);

      // 2) Load batches for mapping batch -> unit
      const { data: allBatches, error: batchesErr } = await supabase
        .from("batches")
        .select("id, unit_id, total_eggs_set, set_date")
        .in("unit_id", unitIds);
      if (batchesErr) throw batchesErr;

      const batchToUnit = new Map<string, string>();
      allBatches?.forEach((b) => batchToUnit.set(b.id, b.unit_id));

      // 3) Eggs set this week (by set_date)
      const eggsMap = new Map<string, number>();
      allBatches
        ?.filter((b) => b.set_date >= startStr && b.set_date <= endStr)
        .forEach((b) => {
          eggsMap.set(b.unit_id, (eggsMap.get(b.unit_id) || 0) + (b.total_eggs_set || 0));
        });

      // 4) Fertility & Hatch (fertility_analysis) within week
      const batchIds = allBatches?.map((b) => b.id) || [];
      let fertRows: { batch_id: string; fertility_percent: number | null; hatch_percent: number | null }[] = [];
      if (batchIds.length) {
        const { data: fertData, error: fertErr } = await supabase
          .from("fertility_analysis")
          .select("batch_id, fertility_percent, hatch_percent, analysis_date")
          .gte("analysis_date", startStr)
          .lte("analysis_date", endStr)
          .in("batch_id", batchIds);
        if (fertErr) throw fertErr;
        fertRows = fertData || [];
      }

      const fertAgg = new Map<string, { fSum: number; fCnt: number; hSum: number; hCnt: number }>();
      fertRows.forEach((r) => {
        const u = batchToUnit.get(r.batch_id);
        if (!u) return;
        const cur = fertAgg.get(u) || { fSum: 0, fCnt: 0, hSum: 0, hCnt: 0 };
        if (r.fertility_percent != null) {
          cur.fSum += Number(r.fertility_percent);
          cur.fCnt += 1;
        }
        if (r.hatch_percent != null) {
          cur.hSum += Number(r.hatch_percent);
          cur.hCnt += 1;
        }
        fertAgg.set(u, cur);
      });

      // 5) Residue (residue_analysis) within week
      let residueRows: { batch_id: string; residue_percent: number | null }[] = [];
      if (batchIds.length) {
        const { data: resData, error: resErr } = await supabase
          .from("residue_analysis")
          .select("batch_id, residue_percent, analysis_date")
          .gte("analysis_date", startStr)
          .lte("analysis_date", endStr)
          .in("batch_id", batchIds);
        if (resErr) throw resErr;
        residueRows = resData || [];
      }

      const residueAgg = new Map<string, { rSum: number; rCnt: number }>();
      residueRows.forEach((r) => {
        const u = batchToUnit.get(r.batch_id);
        if (!u) return;
        const cur = residueAgg.get(u) || { rSum: 0, rCnt: 0 };
        if (r.residue_percent != null) {
          cur.rSum += Number(r.residue_percent);
          cur.rCnt += 1;
        }
        residueAgg.set(u, cur);
      });

      // 6) QA monitoring avg temp/humidity within week
      let qaRows: { batch_id: string; temperature: number | null; humidity: number | null }[] = [];
      if (batchIds.length) {
        const { data: qaData, error: qaErr } = await supabase
          .from("qa_monitoring")
          .select("batch_id, temperature, humidity, check_date")
          .gte("check_date", startStr)
          .lte("check_date", endStr)
          .in("batch_id", batchIds);
        if (qaErr) throw qaErr;
        qaRows = qaData || [];
      }

      const qaAgg = new Map<string, { tSum: number; tCnt: number; hSum: number; hCnt: number }>();
      qaRows.forEach((r) => {
        const u = batchToUnit.get(r.batch_id);
        if (!u) return;
        const cur = qaAgg.get(u) || { tSum: 0, tCnt: 0, hSum: 0, hCnt: 0 };
        if (r.temperature != null) {
          cur.tSum += Number(r.temperature);
          cur.tCnt += 1;
        }
        if (r.humidity != null) {
          cur.hSum += Number(r.humidity);
          cur.hCnt += 1;
        }
        qaAgg.set(u, cur);
      });

      // 7) Assemble results per unit
      const result: WeeklyMetricsRow[] = units.map((u) => {
        const fert = fertAgg.get(u.id);
        const res = residueAgg.get(u.id);
        const qa = qaAgg.get(u.id);
        return {
          unitId: u.id,
          unitName: u.name,
          eggs_set: eggsMap.get(u.id) || 0,
          fertility_pct: fert && fert.fCnt ? fert.fSum / fert.fCnt : null,
          hatch_pct: fert && fert.hCnt ? fert.hSum / fert.hCnt : null,
          residue_pct: res && res.rCnt ? res.rSum / res.rCnt : null,
          avg_temp: qa && qa.tCnt ? qa.tSum / qa.tCnt : null,
          avg_humidity: qa && qa.hCnt ? qa.hSum / qa.hCnt : null,
        };
      });

      // Sort by unit name for stable output
      result.sort((a, b) => a.unitName.localeCompare(b.unitName));
      return result;
    },
  });
};
