import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── shadcn/ui ─────────────────────────────────────────────────────────────── */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/* ── Icons ─────────────────────────────────────────────────────────────────── */
import {
  Activity, BarChart3, TrendingUp, Calendar as CalendarIcon, Settings,
  Download, RefreshCw, Grid2X2, Save, X, PanelLeftClose, PanelLeftOpen, LayoutGrid,
  Monitor, ChevronDown, ChevronRight
} from "lucide-react";

/* ── Recharts ──────────────────────────────────────────────────────────────── */
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, Area, AreaChart
} from "recharts";

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Types & constants                                                        │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
type Granularity = "year" | "month" | "week" | "day";
type MetricKey =
  | "age_weeks"
  | "total_eggs_set"
  | "eggs_cleared"
  | "eggs_injected"
  | "clear_pct"
  | "injected_pct"
  | "fertility_percent"
  | "early_dead_percent"
  | "mid_dead_percent"
  | "late_dead_percent"
  | "total_mortality_percent"
  | "hatch_percent"
  | "if_dev_percent"
  | "hatch_vs_injected_percent"
  | "hatch_vs_injected_diff"
  | "fertile_eggs"
  | "infertile_eggs"
  | "early_dead"
  | "mid_dead"
  | "late_dead"
  | "hatch_count"
  | "sample_size";
type PercentAgg = "weighted" | "unweighted";
type FacetMode = "flock" | "unit" | "flock_unit";

interface RawRow {
  batch_id: string;
  batch_number: string;
  flock_number: number;
  unit_name: string;
  flock_name: string;
  age_weeks: number;
  total_eggs_set: number;
  eggs_cleared: number;
  eggs_injected: number;
  set_date: string;
  status: string;
  fertility_percent?: number;
  early_dead_percent?: number;
  mid_dead_percent?: number;
  late_dead_percent?: number;
  total_mortality_percent?: number;
  hatch_percent?: number;
  if_dev_percent?: number;
  hatch_vs_injected_percent?: number;
  hatch_vs_injected_diff?: number;
  fertile_eggs?: number;
  infertile_eggs?: number;
  early_dead?: number;
  mid_dead?: number;
  late_dead?: number;
  hatch_count?: number;
  sample_size?: number;
}
interface BucketRow {
  bucketKey: string;
  date: Date;
  count: { 
    age_weeks?: number; 
    total_eggs_set?: number; 
    eggs_cleared?: number; 
    eggs_injected?: number;
    fertile_eggs?: number;
    infertile_eggs?: number;
    early_dead?: number;
    mid_dead?: number;
    late_dead?: number;
    hatch_count?: number;
    sample_size?: number;
  };
  pct: { 
    clear_pct?: number; 
    injected_pct?: number;
    fertility_percent?: number;
    early_dead_percent?: number;
    mid_dead_percent?: number;
    late_dead_percent?: number;
    total_mortality_percent?: number;
    hatch_percent?: number;
    if_dev_percent?: number;
    hatch_vs_injected_percent?: number;
    hatch_vs_injected_diff?: number;
  };
  raw: RawRow[];
}

const metricLabel: Record<MetricKey, string> = {
  age_weeks: "Age (weeks)",
  total_eggs_set: "Total Eggs",
  eggs_cleared: "Clears",
  eggs_injected: "Injected",
  clear_pct: "Clear %",
  injected_pct: "Injected %",
  fertility_percent: "Fertility %",
  early_dead_percent: "Early Dead %",
  mid_dead_percent: "Mid Dead %",
  late_dead_percent: "Late Dead %", 
  total_mortality_percent: "Total Mortality %",
  hatch_percent: "Hatch %",
  if_dev_percent: "I/F %",
  hatch_vs_injected_percent: "Hatch vs Injected %",
  hatch_vs_injected_diff: "Hatch vs Injected (Diff)",
  fertile_eggs: "Fertile Eggs",
  infertile_eggs: "Infertile Eggs",
  early_dead: "Early Dead",
  mid_dead: "Mid Dead",
  late_dead: "Late Dead",
  hatch_count: "Hatched",
  sample_size: "Sample Size",
};
const BASIC_METRICS = [
  "total_eggs_set",
  "eggs_cleared", 
  "eggs_injected",
  "clear_pct",
  "injected_pct",
  "age_weeks",
] as const;

const FERTILITY_METRICS = [
  "fertility_percent",
  "early_dead_percent",
  "mid_dead_percent",
  "late_dead_percent", 
  "total_mortality_percent",
  "hatch_percent",
  "if_dev_percent",
  "hatch_vs_injected_percent",
  "hatch_vs_injected_diff",
] as const;

const ALL_METRICS = [...BASIC_METRICS, ...FERTILITY_METRICS] as const;

const isPercentMetric = (m: MetricKey) => 
  m === "clear_pct" || m === "injected_pct" || 
  m === "fertility_percent" || m === "early_dead_percent" || 
  m === "mid_dead_percent" || m === "late_dead_percent" || 
  m === "total_mortality_percent" || m === "hatch_percent" || 
  m === "if_dev_percent" || m === "hatch_vs_injected_percent";
const validScale = (s: any): s is Granularity => ["year", "month", "week", "day"].includes(s);
const fmtBucketLabel = (d: Date, g: Granularity) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  if (g === "year") return `${y}`;
  if (g === "month") return `${y}-${m}`;
  if (g === "week") { const start = new Date(y, 0, 1); const wk = Math.floor((+d - +start) / (7 * 86400000)) + 1; return `${y}-W${String(wk).padStart(2, "0")}`; }
  return `${y}-${m}-${day}`;
};
const startOfBucket = (d: Date, g: Granularity) => {
  const y = d.getFullYear();
  if (g === "year") return new Date(y, 0, 1);
  if (g === "month") return new Date(y, d.getMonth(), 1);
  if (g === "week") { const t = new Date(d), day = t.getDay(), diff = (day + 6) % 7; t.setDate(t.getDate() - diff); t.setHours(0,0,0,0); return t; }
  const t = new Date(d); t.setHours(0,0,0,0); return t;
};
const toCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
};
const saveFile = (filename: string, content: string, mime = "text/csv;charset=utf-8") => {
  const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};

// Format numbers to max 2 decimal places
const formatNumber = (value: number, isPercent: boolean = false): string => {
  if (isPercent) {
    return value.toFixed(2);
  }
  return Math.round(value).toLocaleString();
};

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#059669", "#fb7185", "#22c55e", "#a78bfa"];

type VizKind =
  | "timeline_bar"
  | "timeline_line"
  | "stacked_counts"
  | "percent_trends"
  | "sparklines"
  | "age_distribution"
  | "heatmap";

const VIZ_LABEL: Record<VizKind, string> = {
  timeline_bar: "Timeline – Bar",
  timeline_line: "Timeline – Line",
  stacked_counts: "Stacked Counts",
  percent_trends: "Percent Trends",
  sparklines: "Sparklines",
  age_distribution: "Age Distribution",
  heatmap: "Heatmap (month×unit)",
};

const DEFAULTS = {
  scale: "month" as Granularity,
  metrics: ["total_eggs_set", "clear_pct"] as MetricKey[],
  facetBy: "flock" as FacetMode,
  from: "",
  to: "",
  pctAgg: "weighted" as PercentAgg,
  viz: "timeline_bar" as VizKind,
};

// Custom Glassmorphic Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="rounded-lg border border-white/20 p-2.5 shadow-xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <p className="text-xs font-semibold text-slate-800 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === '_raw' || entry.dataKey === 'rolling' && entry.value === undefined) return null;
          
          // Check if it's a count metric
          const countMetrics = ['fertile_eggs', 'infertile_eggs', 'early_dead', 'mid_dead', 'late_dead', 'hatch_count', 'sample_size'];
          const isCount = countMetrics.includes(entry.dataKey);
          
          // Check if it's a percentage metric
          const isPercent = entry.dataKey === 'clear_pct' || entry.dataKey === 'injected_pct' || 
                           entry.dataKey.includes('percent') || entry.dataKey.includes('pct') ||
                           (entry.dataKey === 'rolling' && (payload[0].dataKey === 'clear_pct' || payload[0].dataKey === 'injected_pct'));
          
          const formattedValue = isPercent 
            ? `${formatNumber(entry.value, true)}%`
            : entry.value.toLocaleString();
          
          return (
            <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color || '#64748b' }}
              />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-medium text-slate-800">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function EmbrexDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Data */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeStep, setWelcomeStep] = useState(0);

  /* Controls state (synced to URL) */
  const [granularity, setGranularity] = useState<Granularity>(() =>
    validScale(searchParams.get("scale")) ? (searchParams.get("scale") as Granularity) : DEFAULTS.scale
  );
  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = (searchParams.get("metrics") ?? "").split(",").filter(Boolean) as MetricKey[];
    return m.length ? m : DEFAULTS.metrics;
  });
  const [showFertilityMetrics, setShowFertilityMetrics] = useState<boolean>(() => 
    searchParams.get("fertility") === "1"
  );
  const [facetBy, setFacetBy] = useState<FacetMode>(() =>
    (["flock","unit","flock_unit"].includes(searchParams.get("facetBy") || "") ? (searchParams.get("facetBy") as FacetMode) : DEFAULTS.facetBy)
  );
  const [selectedFlocks, setSelectedFlocks] = useState<number[]>(() =>
    (searchParams.get("flocks") || "").split(",").filter(Boolean).map(Number)
  );
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() =>
    (searchParams.get("units") || "").split(",").filter(Boolean)
  );
  const [dateFrom, setDateFrom] = useState<string>(() => searchParams.get("from") || DEFAULTS.from);
  const [dateTo,   setDateTo]   = useState<string>(() => searchParams.get("to")   || DEFAULTS.to);
  const [percentAgg, setPercentAgg] = useState<PercentAgg>(() =>
    (searchParams.get("pctAgg") === "unweighted" ? "unweighted" : DEFAULTS.pctAgg)
  );
  const [rollingAvg, setRollingAvg] = useState<boolean>(() => searchParams.get("roll") === "1");
  const [benchmark, setBenchmark] = useState<number | "">(() => {
    const b = searchParams.get("bench"); if (!b) return ""; const n = Number(b); return Number.isFinite(n) ? n : "";
  });
  const [viz, setViz] = useState<VizKind>(() =>
    (Object.keys(VIZ_LABEL) as VizKind[]).includes((searchParams.get("viz") as VizKind))
      ? (searchParams.get("viz") as VizKind)
      : DEFAULTS.viz
  );
  const [showFertilityCounts, setShowFertilityCounts] = useState<boolean>(() => 
    searchParams.get("fertCount") === "1"
  );

  /* Compare Mode & Sidebar state (URL-synced) */
  const [compareMode, setCompareMode] = useState<boolean>(() => searchParams.get("cmp") === "1");
  const [compareCols, setCompareCols] = useState<number>(() => {
    const c = Number(searchParams.get("cols") || 2);
    return [1,2,3].includes(c) ? c : 2;
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => searchParams.get("nav") !== "0");

  /* Saved views */
  const [savedName, setSavedName] = useState("");
  const savedViews = useMemo(() => {
    const v: string[] = [];
    for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||""; if (k.startsWith("embrexView:")) v.push(k.replace("embrexView:","")); }
    return v.sort();
  }, [searchParams]);

  /* Welcome screen animation sequence */
  useEffect(() => {
    if (!showWelcome) return;
    
    const timer1 = setTimeout(() => setWelcomeStep(1), 1000);
    const timer2 = setTimeout(() => setWelcomeStep(2), 3000);
    const timer3 = setTimeout(() => setWelcomeStep(3), 5000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [showWelcome]);

  /* Load data */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("batches")
          .select(`
            id, batch_number, total_eggs_set, eggs_cleared, eggs_injected, chicks_hatched, set_date, status,
            units ( name ),
            flocks!inner(flock_number, flock_name, age_weeks),
            fertility_analysis (
              fertility_percent,
              hatch_percent,
              hof_percent,
              hoi_percent,
              if_dev_percent,
              early_dead,
              late_dead,
              fertile_eggs,
              infertile_eggs,
              sample_size
            ),
            residue_analysis (
              residue_percent,
              hatch_percent,
              hof_percent,
              hoi_percent,
              if_dev_percent,
              mid_dead
            )
          `)
          .order("set_date", { ascending: true });
        if (error) throw error;

        const formatted: RawRow[] = (data ?? []).map((b: any) => {
          // Calculate mortality percentages from fertility and residue analysis
          const fertility = b.fertility_analysis?.[0];
          const residue = b.residue_analysis?.[0];
          const totalEggs = Number(b.total_eggs_set ?? 0);
          const eggsInjected = Number(b.eggs_injected ?? 0);
          const chicksHatched = Number(b.chicks_hatched ?? 0);
          
          let early_dead_percent = 0;
          let mid_dead_percent = 0;
          let late_dead_percent = 0;
          let total_mortality_percent = 0;
          
          if (fertility && totalEggs > 0) {
            early_dead_percent = ((fertility.early_dead ?? 0) / totalEggs) * 100;
            late_dead_percent = ((fertility.late_dead ?? 0) / totalEggs) * 100;
          }
          
          // Add mid_dead from residue analysis
          if (residue && totalEggs > 0) {
            mid_dead_percent = ((residue.mid_dead ?? 0) / totalEggs) * 100;
          }
          
          total_mortality_percent = early_dead_percent + mid_dead_percent + late_dead_percent;
          
          // Calculate Hatch vs Injected metrics
          let hatch_vs_injected_percent = 0;
          let hatch_vs_injected_diff = 0;
          
          if (eggsInjected > 0) {
            hatch_vs_injected_percent = (chicksHatched / eggsInjected) * 100;
          }
          hatch_vs_injected_diff = eggsInjected - chicksHatched;

          return {
            batch_id: b.id,
            batch_number: b.batch_number,
            flock_number: b.flocks.flock_number,
            unit_name: b.units?.name ?? "",
            flock_name: b.flocks.flock_name,
            age_weeks: Number(b.flocks.age_weeks ?? 0),
            total_eggs_set: totalEggs,
            eggs_cleared: Number(b.eggs_cleared ?? 0),
            eggs_injected: eggsInjected,
            set_date: b.set_date,
            status: b.status ?? "",
            fertility_percent: fertility?.fertility_percent ?? residue?.fertility_percent,
            early_dead_percent,
            mid_dead_percent,
            late_dead_percent,
            total_mortality_percent,
            hatch_percent: fertility?.hatch_percent ?? residue?.hatch_percent,
            if_dev_percent: fertility?.if_dev_percent ?? residue?.if_dev_percent,
            hatch_vs_injected_percent,
            hatch_vs_injected_diff,
            fertile_eggs: fertility?.fertile_eggs,
            infertile_eggs: fertility?.infertile_eggs,
            early_dead: fertility?.early_dead,
            mid_dead: residue?.mid_dead,
            late_dead: fertility?.late_dead,
            hatch_count: chicksHatched,
            sample_size: fertility?.sample_size,
          };
        });
        setRows(formatted);
      } catch (e) {
        console.error(e);
        toast({ title: "Failed to load", description: "Could not load timeline data.", variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, [toast]);

  /* URL sync */
  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("scale", granularity);
    if (metrics.length) sp.set("metrics", metrics.join(","));
    sp.set("facetBy", facetBy);
    if (selectedFlocks.length) sp.set("flocks", selectedFlocks.join(","));
    if (selectedUnits.length) sp.set("units", selectedUnits.join(","));
    if (dateFrom) sp.set("from", dateFrom);
    if (dateTo) sp.set("to", dateTo);
    sp.set("pctAgg", percentAgg);
    if (rollingAvg) sp.set("roll", "1"); else sp.delete("roll");
    if (benchmark !== "" && Number.isFinite(Number(benchmark))) sp.set("bench", String(benchmark)); else sp.delete("bench");
    sp.set("viz", viz);
    if (compareMode) sp.set("cmp","1"); else sp.delete("cmp");
    if (compareCols !== 2) sp.set("cols", String(compareCols)); else sp.delete("cols");
    sp.set("nav", sidebarOpen ? "1" : "0");
    if (showFertilityMetrics) sp.set("fertility", "1"); else sp.delete("fertility");
    if (showFertilityCounts) sp.set("fertCount", "1"); else sp.delete("fertCount");
    setSearchParams(sp, { replace: true });
  }, [
    granularity, metrics, facetBy, selectedFlocks, selectedUnits, dateFrom, dateTo,
    percentAgg, rollingAvg, benchmark, viz, compareMode, compareCols, sidebarOpen, 
    showFertilityMetrics, showFertilityCounts, setSearchParams
  ]);

  /* Derived lists */
  const units = useMemo(
    () => Array.from(new Set(rows.map(r => (r.unit_name || "").trim()).filter(Boolean))).sort(),
    [rows]
  );
  const flocksList = useMemo(() => {
    const uniq = new Map<number, string>();
    rows.forEach(r => { if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name); });
    return [...uniq.entries()].sort((a,b)=>a[0]-b[0]).map(([num,name])=>({num, name}));
  }, [rows]);
  const flocksMap = useMemo(() => new Map(flocksList.map(({num,name}) => [num, name])), [flocksList]);

  /* Filtering */
  const baseFilteredRows = useMemo(() => {
    let out = rows;
    if (selectedUnits.length) {
      const allow = new Set(selectedUnits.map(u => u.toLowerCase()));
      out = out.filter(r => (r.unit_name||"").toLowerCase() && allow.has(r.unit_name.toLowerCase()));
    }
    if (selectedFlocks.length) {
      const allow = new Set(selectedFlocks);
      out = out.filter(r => allow.has(r.flock_number));
    }
    if (dateFrom) { const from = new Date(dateFrom); out = out.filter(r => new Date(r.set_date) >= from); }
    if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); out = out.filter(r => new Date(r.set_date) <= to); }
    return out;
  }, [rows, selectedUnits, selectedFlocks, dateFrom, dateTo]);

  /* Facets */
  type Facet = { key: string; title: string; rows: RawRow[]; };
  const facets: Facet[] = useMemo(() => {
    const data = baseFilteredRows;
    if (facetBy === "flock") {
      if (!selectedFlocks.length) return [{ key: "ALL", title: "All flocks", rows: data }];
      return selectedFlocks.map(num => ({
        key: `F-${num}`,
        title: `Flock #${num} — ${flocksMap.get(num) ?? ""}`,
        rows: data.filter(r => r.flock_number === num),
      }));
    }
    if (facetBy === "unit") {
      const list = selectedUnits.length ? selectedUnits : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
      return list.map(u => ({ key: `U-${u}`, title: `Unit: ${u}`, rows: data.filter(r => (r.unit_name||"").toLowerCase() === u.toLowerCase()) }));
    }
    const flockList = selectedFlocks.length ? selectedFlocks : Array.from(new Set(data.map(r => r.flock_number)));
    const unitList = selectedUnits.length ? selectedUnits : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
    const out: Facet[] = [];
    for (const f of flockList) for (const u of unitList) {
      out.push({
        key: `FU-${f}-${u}`,
        title: `Flock #${f} — ${flocksMap.get(f) ?? ""} • Unit: ${u}`,
        rows: data.filter(r => r.flock_number === f && (r.unit_name||"").toLowerCase() === u.toLowerCase()),
      });
    }
    return out.length ? out : [{ key: "ALL", title: "All flocks", rows: data }];
  }, [facetBy, baseFilteredRows, selectedFlocks, selectedUnits, flocksMap]);

  /* Bucketing + chart data */
  const buildBuckets = (subset: RawRow[]): BucketRow[] => {
    const map = new Map<string, BucketRow>();
    for (const r of subset) {
      const d = new Date(r.set_date);
      const start = startOfBucket(d, granularity);
      const key = fmtBucketLabel(start, granularity);
      if (!map.has(key)) map.set(key, { bucketKey: key, date: start, count: {}, pct: {}, raw: [] });
      const b = map.get(key)!;
      b.count.total_eggs_set = (b.count.total_eggs_set ?? 0) + (r.total_eggs_set ?? 0);
      b.count.eggs_cleared   = (b.count.eggs_cleared   ?? 0) + (r.eggs_cleared   ?? 0);
      b.count.eggs_injected  = (b.count.eggs_injected  ?? 0) + (r.eggs_injected  ?? 0);
      b.count.age_weeks      = (b.count.age_weeks      ?? 0) + (r.age_weeks      ?? 0);
      b.count.fertile_eggs   = (b.count.fertile_eggs   ?? 0) + (r.fertile_eggs   ?? 0);
      b.count.infertile_eggs = (b.count.infertile_eggs ?? 0) + (r.infertile_eggs ?? 0);
      b.count.early_dead     = (b.count.early_dead     ?? 0) + (r.early_dead     ?? 0);
      b.count.mid_dead       = (b.count.mid_dead       ?? 0) + (r.mid_dead       ?? 0);
      b.count.late_dead      = (b.count.late_dead      ?? 0) + (r.late_dead      ?? 0);
      b.count.hatch_count    = (b.count.hatch_count    ?? 0) + (r.hatch_count    ?? 0);
      b.count.sample_size    = (b.count.sample_size    ?? 0) + (r.sample_size    ?? 0);
      b.raw.push(r);
    }
    const out: BucketRow[] = [];
    map.forEach((b) => {
      const sumSet = b.count.total_eggs_set ?? 0;
      const sumClr = b.count.eggs_cleared ?? 0;
      const sumInj = b.count.eggs_injected ?? 0;
      
      // Calculate weighted averages for fertility metrics
      const fertilityVals = b.raw.filter(r => r.fertility_percent != null);
      const earlyVals = b.raw.filter(r => r.early_dead_percent != null);
      const midVals = b.raw.filter(r => r.mid_dead_percent != null);
      const lateVals = b.raw.filter(r => r.late_dead_percent != null);
      const totalMortVals = b.raw.filter(r => r.total_mortality_percent != null);
      const hatchVals = b.raw.filter(r => r.hatch_percent != null);
      const ifVals = b.raw.filter(r => r.if_dev_percent != null);
      const hatchVsInjectedPctVals = b.raw.filter(r => r.hatch_vs_injected_percent != null);
      const hatchVsInjectedDiffVals = b.raw.filter(r => r.hatch_vs_injected_diff != null);
      
      if (percentAgg === "weighted") {
        b.pct.clear_pct = sumSet > 0 ? (sumClr / sumSet) * 100 : 0;
        b.pct.injected_pct = sumSet > 0 ? (sumInj / sumSet) * 100 : 0;
        
        // Weighted averages for fertility metrics
        b.pct.fertility_percent = fertilityVals.length > 0 ? 
          fertilityVals.reduce((sum, r) => sum + (r.fertility_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.early_dead_percent = earlyVals.length > 0 ? 
          earlyVals.reduce((sum, r) => sum + (r.early_dead_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.mid_dead_percent = midVals.length > 0 ? 
          midVals.reduce((sum, r) => sum + (r.mid_dead_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.late_dead_percent = lateVals.length > 0 ? 
          lateVals.reduce((sum, r) => sum + (r.late_dead_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.total_mortality_percent = totalMortVals.length > 0 ? 
          totalMortVals.reduce((sum, r) => sum + (r.total_mortality_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.hatch_percent = hatchVals.length > 0 ? 
          hatchVals.reduce((sum, r) => sum + (r.hatch_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.if_dev_percent = ifVals.length > 0 ? 
          ifVals.reduce((sum, r) => sum + (r.if_dev_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.hatch_vs_injected_percent = hatchVsInjectedPctVals.length > 0 ? 
          hatchVsInjectedPctVals.reduce((sum, r) => sum + (r.hatch_vs_injected_percent! * (r.eggs_injected || 0)), 0) / sumInj : 0;
        b.pct.hatch_vs_injected_diff = hatchVsInjectedDiffVals.length > 0 ? 
          hatchVsInjectedDiffVals.reduce((sum, r) => sum + r.hatch_vs_injected_diff!, 0) : 0;
      } else {
        const valsClr = b.raw.map(r => (r.total_eggs_set ? (r.eggs_cleared ?? 0) / r.total_eggs_set * 100 : 0));
        const valsInj = b.raw.map(r => (r.total_eggs_set ? (r.eggs_injected ?? 0) / r.total_eggs_set * 100 : 0));
        
        // Unweighted averages for fertility metrics
        b.pct.fertility_percent = fertilityVals.length > 0 ? 
          fertilityVals.reduce((sum, r) => sum + r.fertility_percent!, 0) / fertilityVals.length : 0;
        b.pct.early_dead_percent = earlyVals.length > 0 ? 
          earlyVals.reduce((sum, r) => sum + r.early_dead_percent!, 0) / earlyVals.length : 0;
        b.pct.mid_dead_percent = midVals.length > 0 ? 
          midVals.reduce((sum, r) => sum + r.mid_dead_percent!, 0) / midVals.length : 0;
        b.pct.late_dead_percent = lateVals.length > 0 ? 
          lateVals.reduce((sum, r) => sum + r.late_dead_percent!, 0) / lateVals.length : 0;
        b.pct.total_mortality_percent = totalMortVals.length > 0 ? 
          totalMortVals.reduce((sum, r) => sum + r.total_mortality_percent!, 0) / totalMortVals.length : 0;
        b.pct.hatch_percent = hatchVals.length > 0 ? 
          hatchVals.reduce((sum, r) => sum + r.hatch_percent!, 0) / hatchVals.length : 0;
        b.pct.if_dev_percent = ifVals.length > 0 ? 
          ifVals.reduce((sum, r) => sum + r.if_dev_percent!, 0) / ifVals.length : 0;
        b.pct.hatch_vs_injected_percent = hatchVsInjectedPctVals.length > 0 ? 
          hatchVsInjectedPctVals.reduce((sum, r) => sum + r.hatch_vs_injected_percent!, 0) / hatchVsInjectedPctVals.length : 0;
        b.pct.hatch_vs_injected_diff = hatchVsInjectedDiffVals.length > 0 ? 
          hatchVsInjectedDiffVals.reduce((sum, r) => sum + r.hatch_vs_injected_diff!, 0) / hatchVsInjectedDiffVals.length : 0;
        
        b.pct.clear_pct = valsClr.length ? valsClr.reduce((a, c) => a + c, 0) / valsClr.length : 0;
        b.pct.injected_pct = valsInj.length ? valsInj.reduce((a, c) => a + c, 0) / valsInj.length : 0;
        b.pct.clear_pct = valsClr.length ? valsClr.reduce((a, c) => a + c, 0) / valsClr.length : 0;
        b.pct.injected_pct = valsInj.length ? valsInj.reduce((a, c) => a + c, 0) / valsInj.length : 0;
      }
      out.push(b);
    });
    out.sort((a,b)=>+a.date - +b.date);
    return out;
  };

  const chartDataForFacet = (facetRows: RawRow[]) => {
    const buckets = buildBuckets(facetRows);
    const firstMetric = metrics[0] ?? "total_eggs_set";
    const values = buckets.map(b => isPercentMetric(firstMetric) ? (b.pct as any)[firstMetric] ?? 0 : (b.count as any)[firstMetric] ?? 0);
    const rollWindow = 3;
    const rolling = rollingAvg ? values.map((_, i) => {
      const s = Math.max(0, i - rollWindow + 1); const slice = values.slice(s, i + 1); return slice.reduce((a,c)=>a+c,0) / slice.length;
    }) : [];
    return buckets.map((b, i) => ({
      bucket: b.bucketKey, date: b.date,
      total_eggs_set: b.count.total_eggs_set ?? 0,
      eggs_cleared: b.count.eggs_cleared ?? 0,
      eggs_injected: b.count.eggs_injected ?? 0,
      age_weeks: b.count.age_weeks ?? 0,
      clear_pct: b.pct.clear_pct ?? 0,
      injected_pct: b.pct.injected_pct ?? 0,
      fertility_percent: b.pct.fertility_percent ?? 0,
      early_dead_percent: b.pct.early_dead_percent ?? 0,
      mid_dead_percent: b.pct.mid_dead_percent ?? 0,
      late_dead_percent: b.pct.late_dead_percent ?? 0,
      total_mortality_percent: b.pct.total_mortality_percent ?? 0,
      hatch_percent: b.pct.hatch_percent ?? 0,
      if_dev_percent: b.pct.if_dev_percent ?? 0,
      hatch_vs_injected_percent: b.pct.hatch_vs_injected_percent ?? 0,
      hatch_vs_injected_diff: b.pct.hatch_vs_injected_diff ?? 0,
      fertile_eggs: b.count.fertile_eggs ?? 0,
      infertile_eggs: b.count.infertile_eggs ?? 0,
      early_dead: b.count.early_dead ?? 0,
      mid_dead: b.count.mid_dead ?? 0,
      late_dead: b.count.late_dead ?? 0,
      hatch_count: b.count.hatch_count ?? 0,
      sample_size: b.count.sample_size ?? 0,
      rolling: rollingAvg ? rolling[i] : undefined,
      _raw: b.raw,
    }));
  };

  /* Drill-down modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState<RawRow[]>([]);
  const openDrill = (facetTitle: string, bucketLabel: string, raw: RawRow[]) => {
    setModalTitle(`${facetTitle} • ${bucketLabel}`); setModalRows(raw); setModalOpen(true);
  };

  /* Export / Saved Views */
  const exportBucketsCsv = () => {
    const out: Record<string, any>[] = [];
    (compareMode ? facets : [facets.find(f=>true)!]).forEach(f => {
      const dat = chartDataForFacet(f.rows);
      dat.forEach(r => out.push({
        facet: f.title, bucket: r.bucket,
        total_eggs_set: r.total_eggs_set, eggs_cleared: r.eggs_cleared, eggs_injected: r.eggs_injected,
        clear_pct: parseFloat(r.clear_pct.toFixed(2)), injected_pct: parseFloat(r.injected_pct.toFixed(2)),
        fertility_percent: parseFloat((r.fertility_percent || 0).toFixed(2)),
        early_dead_percent: parseFloat((r.early_dead_percent || 0).toFixed(2)),
        mid_dead_percent: parseFloat((r.mid_dead_percent || 0).toFixed(2)),
        late_dead_percent: parseFloat((r.late_dead_percent || 0).toFixed(2)),
        total_mortality_percent: parseFloat((r.total_mortality_percent || 0).toFixed(2)),
        hatch_percent: parseFloat((r.hatch_percent || 0).toFixed(2)),
        if_dev_percent: parseFloat((r.if_dev_percent || 0).toFixed(2)),
        hatch_vs_injected_percent: parseFloat((r.hatch_vs_injected_percent || 0).toFixed(2)),
        hatch_vs_injected_diff: parseFloat((r.hatch_vs_injected_diff || 0).toFixed(2)),
        fertile_eggs: r.fertile_eggs || 0,
        infertile_eggs: r.infertile_eggs || 0,
        early_dead: r.early_dead || 0,
        mid_dead: r.mid_dead || 0,
        late_dead: r.late_dead || 0,
        hatch_count: r.hatch_count || 0,
        sample_size: r.sample_size || 0,
        rolling: r.rolling ? parseFloat(r.rolling.toFixed(2)) : ""
      }));
    });
    saveFile("embrex_timeline.csv", toCsv(out));
  };
  const saveCurrentView = () => {
    if (!savedName.trim()) { toast({ title: "Name required", description: "Provide a name to save this view." }); return; }
    localStorage.setItem(`embrexView:${savedName.trim()}`, searchParams.toString());
    toast({ title: "View saved", description: `"${savedName}" saved.` }); setSavedName("");
  };
  const applySavedView = (name: string) => {
    const qs = localStorage.getItem(`embrexView:${name}`);
    if (!qs) return toast({ title: "Not found", description: "Saved view does not exist.", variant: "destructive" });
    const url = new URL(window.location.href); url.search = qs; window.location.assign(url.toString());
  };

  /* Metric palette */
  const basicMetricOptions = [
    { value: "total_eggs_set", label: "Total Eggs", color: PALETTE[0] },
    { value: "eggs_cleared",   label: "Clears",     color: PALETTE[1] },
    { value: "eggs_injected",  label: "Injected",   color: PALETTE[2] },
    { value: "clear_pct",      label: "Clear %",    color: PALETTE[3] },
    { value: "injected_pct",   label: "Injected %", color: PALETTE[4] },
    { value: "age_weeks",      label: "Age (w)",    color: PALETTE[5] },
  ] as const;

  const fertilityPercentMetricOptions = [
    { value: "fertility_percent", label: "Fertility %", color: PALETTE[0] },
    { value: "early_dead_percent", label: "Early Dead %", color: PALETTE[1] },
    { value: "mid_dead_percent", label: "Mid Dead %", color: PALETTE[2] },
    { value: "late_dead_percent", label: "Late Dead %", color: PALETTE[3] },
    { value: "total_mortality_percent", label: "Total Mortality %", color: PALETTE[4] },
    { value: "hatch_percent", label: "Hatch %", color: PALETTE[5] },
    { value: "if_dev_percent", label: "I/F %", color: PALETTE[6] },
  ] as const;

  const fertilityCountMetricOptions = [
    { value: "fertile_eggs", label: "Fertile Eggs", color: PALETTE[0] },
    { value: "infertile_eggs", label: "Infertile Eggs", color: PALETTE[1] },
    { value: "eggs_injected", label: "Injected", color: PALETTE[2] },
    { value: "early_dead", label: "Early Dead", color: PALETTE[3] },
    { value: "mid_dead", label: "Mid Dead", color: PALETTE[4] },
    { value: "late_dead", label: "Late Dead", color: PALETTE[5] },
    { value: "hatch_count", label: "Hatch Count", color: PALETTE[6] },
    { value: "sample_size", label: "Sample Size", color: PALETTE[7] },
  ] as const;

  const metricOptions = showFertilityMetrics 
    ? (showFertilityCounts ? fertilityCountMetricOptions : fertilityPercentMetricOptions)
    : basicMetricOptions;

  /* Facet tabs state */
  const [activeFacet, setActiveFacet] = useState<string>("ALL");
  useEffect(() => {
    if (!facets.find(f => f.key === activeFacet)) {
      setActiveFacet(facets[0]?.key ?? "ALL");
    }
  }, [facets, activeFacet]);

  /* ─────────────── Chart renderer (fills container; no hardcoded height) ─────────────── */
  const renderChart = (data: any[], facetTitle: string) => {
    const commonMargin = { top: 8, right: 16, left: 8, bottom: 8 };

    if (viz === "timeline_bar" || viz === "timeline_line") {
      const isBar = viz === "timeline_bar";
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={commonMargin}
              onClick={(e:any)=>{ if (!e?.activePayload?.length) return; const p=e.activePayload[0]?.payload; if (!p) return; openDrill(facetTitle, p.bucket as string, p._raw as RawRow[]); }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {benchmark !== "" && Number.isFinite(Number(benchmark)) && (
                <ReferenceLine
                  yAxisId="right"
                  y={Number(benchmark)}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: `Target ${benchmark}%`, fontSize: 11 }}
                />
              )}
              {metrics.map((m, i) => {
                const allOptions = [...basicMetricOptions, ...fertilityPercentMetricOptions, ...fertilityCountMetricOptions];
                const color = allOptions.find(mm => mm.value === m)?.color || PALETTE[i % PALETTE.length];
                const yAxis = isPercentMetric(m) ? "right" : "left";
                return isBar
                  ? <Bar key={m} dataKey={m} yAxisId={yAxis} fill={color} radius={[4,4,0,0]} name={metricLabel[m]} />
                  : <Line key={m} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} strokeWidth={2} dot={{ r: 2 }} name={metricLabel[m]} />;
              })}
              {rollingAvg && (
                <Line
                  type="monotone"
                  dataKey="rolling"
                  yAxisId={isPercentMetric(metrics[0] ?? "total_eggs_set") ? "right" : "left"}
                  stroke="#64748b"
                  dot={false}
                  strokeDasharray="5 5"
                  name="Rolling Avg"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "stacked_counts") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="total_eggs_set" stackId="a" fill={PALETTE[0]} name="Total Eggs" />
              <Bar dataKey="eggs_cleared"  stackId="a" fill={PALETTE[2]} name="Clears" />
              <Bar dataKey="eggs_injected" stackId="a" fill={PALETTE[1]} name="Injected" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "percent_trends") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis domain={[0,100]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="clear_pct" stroke={PALETTE[3]} fill={PALETTE[3]} fillOpacity={0.25} strokeWidth={2} name="Clear %" />
              <Area type="monotone" dataKey="injected_pct" stroke={PALETTE[4]} fill={PALETTE[4]} fillOpacity={0.25} strokeWidth={2} name="Injected %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "sparklines") {
      const keys: MetricKey[] = ["total_eggs_set","clear_pct","injected_pct"];
      return (
        <div className="grid gap-3 md:grid-cols-3 h-full">
          {keys.map((k, i)=>(
            <div key={k} className="p-2 border rounded-md flex flex-col min-h-0">
              <div className="text-xs text-muted-foreground mb-1">{metricLabel[k]}</div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={commonMargin}>
                    <XAxis dataKey="bucket" hide />
                    <YAxis hide domain={isPercentMetric(k) ? [0,100] : ["auto","auto"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={k} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viz === "age_distribution") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="age_weeks" fill="#94a3b8" radius={[4,4,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "heatmap") {
      const months = Array.from(new Set(data.map((d:any)=>d.bucket)));
      const allRaw: RawRow[] = data.flatMap((d:any)=> d._raw ?? []);
      const byUnit: Record<string, Record<string, number>> = {};
      const g = granularity; const fmt = (dt:string)=> fmtBucketLabel(startOfBucket(new Date(dt), g), g);
      allRaw.forEach(r=>{
        const b = fmt(r.set_date);
        byUnit[r.unit_name] = byUnit[r.unit_name] || {};
        byUnit[r.unit_name][b] = (byUnit[r.unit_name][b] || 0) + (r.total_eggs_set || 0);
      });
      const maxVal = Math.max(0, ...Object.values(byUnit).flatMap(x=>Object.values(x)));
      
      // Helper to get color based on value intensity - yellow to orange to red gradient
      const getHeatColor = (value: number, max: number) => {
        if (!value || !max) return '#f8fafc'; // Very light gray for empty cells
        const intensity = value / max;
        
        // Yellow → Orange → Red gradient (similar to reference image)
        if (intensity < 0.25) {
          return '#fef3c7'; // Very light yellow
        } else if (intensity < 0.5) {
          return '#fed7aa'; // Light orange
        } else if (intensity < 0.65) {
          return '#fdba74'; // Medium orange
        } else if (intensity < 0.8) {
          return '#fb923c'; // Strong orange
        } else if (intensity < 0.9) {
          return '#f97316'; // Deep orange
        } else {
          return '#ea580c'; // Red for highest values
        }
      };

      return (
        <div className="space-y-3 h-full overflow-auto">
          <div className="inline-block min-w-full">
            <div className="grid gap-2" style={{ gridTemplateColumns: `160px repeat(${months.length}, minmax(60px, 1fr))` }}>
              <div className="text-sm font-semibold text-foreground sticky left-0 bg-background py-2">Unit</div>
              {months.map((mo) => (
                <div key={mo} className="text-xs font-medium text-muted-foreground text-center py-2" title={mo}>
                  {mo}
                </div>
              ))}
              
              {Object.entries(byUnit).map(([u, m])=>(
                <>
                  <div key={`${u}-label`} className="text-sm py-3 font-medium sticky left-0 bg-background" title={u}>
                    {u || "—"}
                  </div>
                  {months.map((mo)=> {
                    const v = m[mo] || 0;
                    const bgColor = getHeatColor(v, maxVal);
                    return (
                      <div 
                        key={`${u}-${mo}`} 
                        className="h-16 rounded-md border border-border flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                        style={{ backgroundColor: bgColor }}
                        title={`${u} • ${mo}: ${v.toLocaleString()} eggs`}
                      >
                        <span className="text-xs font-semibold text-foreground">
                          {v > 0 ? (v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toLocaleString()) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 pt-3 border-t bg-background">
            <span className="text-sm font-medium text-foreground">Intensity:</span>
            <div className="flex items-center gap-2">
              {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                <div key={intensity} className="flex items-center gap-1.5">
                  <div 
                    className="w-10 h-6 rounded border border-border"
                    style={{ backgroundColor: getHeatColor(intensity * maxVal, maxVal) }}
                  />
                  <span className="text-xs text-muted-foreground min-w-[40px]">
                    {intensity === 0 ? 'Low' : intensity === 1 ? 'High' : `${(intensity*100).toFixed(0)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* Active facet & basic stats */
  const activeFacetObj = facets.find(f => f.key === activeFacet) || facets[0];
  const activeData = activeFacetObj ? chartDataForFacet(activeFacetObj.rows) : [];
  const totalEggs = activeData.reduce((a,c)=>a+(c.total_eggs_set||0),0);
  const avgClear = activeData.length ? (activeData.reduce((a,c)=>a+(c.clear_pct||0),0)/activeData.length) : 0;
  const avgInj = activeData.length ? (activeData.reduce((a,c)=>a+(c.injected_pct||0),0)/activeData.length) : 0;
  const avgAge = (() => {
    const allRawRows = activeFacetObj?.rows || [];
    return allRawRows.length ? (allRawRows.reduce((a,c)=>a+(c.age_weeks||0),0)/allRawRows.length) : 0;
  })();
  const avgFertility = activeData.length ? (activeData.reduce((a,c)=>a+(c.fertility_percent||0),0)/activeData.length) : 0;
  const avgHatch = activeData.length ? (activeData.reduce((a,c)=>a+(c.hatch_percent||0),0)/activeData.length) : 0;
  const avgMortality = activeData.length ? (activeData.reduce((a,c)=>a+(c.total_mortality_percent||0),0)/activeData.length) : 0;

  const filterCount = (() => {
    let n = 0;
    if (facetBy !== DEFAULTS.facetBy) n++;
    if (selectedFlocks.length) n++;
    if (selectedUnits.length) n++;
    if (granularity !== DEFAULTS.scale) n++;
    if (metrics.join(",") !== DEFAULTS.metrics.join(",")) n++;
    if (dateFrom || dateTo) n++;
    if (percentAgg !== DEFAULTS.pctAgg || rollingAvg || benchmark !== "") n++;
    if (viz !== DEFAULTS.viz) n++;
    if (compareMode) n++;
    return n;
  })();

  /* Welcome Screen Component */
  const WelcomeScreen = () => (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      <div className="max-w-2xl mx-auto px-6 text-center">
        {/* Main Content Container */}
        <div className="space-y-12">
          
          {/* Header Section */}
          <div 
            className={`transition-all duration-700 ease-out ${
              welcomeStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {/* Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/10 mb-6">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Timeline Analysis
            </h1>
            <div className="h-0.5 w-16 bg-blue-600 mx-auto mb-6"></div>
          </div>

          {/* Description */}
          <div 
            className={`transition-all duration-700 ease-out delay-300 ${
              welcomeStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <p className="text-xl text-slate-600 leading-relaxed mb-8">
              Discover insights from your hatchery data with powerful visualizations and analytics
            </p>
          </div>

          {/* Call to Action */}
          <div 
            className={`transition-all duration-700 ease-out delay-700 ${
              welcomeStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <p className="text-lg text-slate-700 mb-6">
                Choose your visualization and metrics to start exploring your data
              </p>
              
              {/* Feature Tags */}
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                {["Timeline", "Trends", "Comparisons", "Analytics"].map((tag) => (
                  <span 
                    key={tag}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Start Button */}
              <Button 
                onClick={() => setShowWelcome(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-xl transition-colors duration-200"
                size="lg"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Start Analyzing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Sidebar dropdown (collapsible) state + outside click close ─────────── */
  const vizCardRef = useRef<HTMLDivElement>(null);
  const metricsCardRef = useRef<HTMLDivElement>(null);
  const [vizOpen, setVizOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!(vizOpen || metricsOpen)) return;
      const t = e.target as Node;
      const insideViz = vizCardRef.current?.contains(t);
      const insideMet = metricsCardRef.current?.contains(t);
      if (!insideViz && !insideMet) {
        setVizOpen(false);
        setMetricsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [vizOpen, metricsOpen]);

  /* ─────────────────────────────── SHELL (no top header) ──────────────────── */
  if (showWelcome) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="h-full w-full grid" style={{ gridTemplateColumns: sidebarOpen ? "320px 1fr" : "0px 1fr" }}>
        {/* Sidebar (full height, scrollable) */}
        <aside className={`h-full border-r bg-white/80 backdrop-blur overflow-y-auto ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="p-3 space-y-3">
            {/* Visualization (collapsible) */}
            <Card ref={vizCardRef} className="shadow-sm border-0">
              <button type="button" onClick={() => { setVizOpen(o=>!o); setMetricsOpen(false); }} aria-expanded={vizOpen} className="w-full text-left">
                <CardHeader className="pb-2 flex-row items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold flex-1">Visualization</CardTitle>
                  {vizOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CardHeader>
              </button>
              {vizOpen && (
                <CardContent className="space-y-2 pt-0">
                  {([
                    { value: "timeline_bar", label: "Timeline Bar", icon: BarChart3 },
                    { value: "timeline_line", label: "Timeline Line", icon: TrendingUp },
                    { value: "stacked_counts", label: "Stacked Counts", icon: BarChart3 },
                    { value: "percent_trends", label: "Percent Trends", icon: Activity },
                    { value: "sparklines", label: "Sparklines", icon: Activity },
                    { value: "age_distribution", label: "Age Distribution", icon: Activity },
                    { value: "heatmap", label: "Heatmap", icon: Activity },
                  ] as Array<{value: VizKind; label: string; icon: any}>).map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <Button
                        key={opt.value}
                        variant={viz === opt.value ? "default" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => setViz(opt.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </Button>
                    );
                  })}
                </CardContent>
              )}
            </Card>

            {/* Metrics (collapsible) */}
            <Card ref={metricsCardRef} className="shadow-sm border-0">
              <button type="button" onClick={() => { setMetricsOpen(o=>!o); setVizOpen(false); }} aria-expanded={metricsOpen} className="w-full text-left">
                <CardHeader className="pb-2 flex-row items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-sm font-semibold flex-1">Metrics</CardTitle>
                  {metricsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CardHeader>
              </button>
              {metricsOpen && (
                <CardContent className="space-y-2 pt-0">
                  {/* Metrics Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">
                        {showFertilityMetrics ? "Fertility & Mortality Metrics" : "Basic Metrics"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowFertilityMetrics(!showFertilityMetrics);
                        // Reset metrics when switching to avoid conflicts
                        setMetrics(showFertilityMetrics ? ["total_eggs_set", "clear_pct"] : ["fertility_percent", "hatch_percent"]);
                      }}
                      className="h-8 text-xs"
                    >
                      Switch to {showFertilityMetrics ? "Basic" : "Fertility"}
                    </Button>
                  </div>

                  {/* Count/Percentage Toggle for Fertility Metrics */}
                  {showFertilityMetrics && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-sm font-medium">
                          {showFertilityCounts ? "Showing Counts" : "Showing Percentages"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowFertilityCounts(!showFertilityCounts);
                          // Reset metrics when toggling
                          setMetrics(showFertilityCounts 
                            ? ["fertility_percent", "hatch_percent"] 
                            : ["fertile_eggs", "early_dead"]);
                        }}
                        className="h-8 text-xs"
                      >
                        Show {showFertilityCounts ? "%" : "Counts"}
                      </Button>
                    </div>
                  )}
                  
                  {metricOptions.map((metric) => (
                    <div key={metric.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.value}
                        checked={metrics.includes(metric.value as MetricKey)}
                        onCheckedChange={(checked) => {
                          setMetrics(prev => checked ? [...prev, metric.value as MetricKey] : prev.filter(m => m !== (metric.value as MetricKey)));
                        }}
                      />
                      <label htmlFor={metric.value} className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: metric.color }} />
                        {metric.label}
                      </label>
                    </div>
                  ))}
                  {metrics.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {metrics.slice(0,6).map(m => (
                        <Badge key={m} variant="secondary" className="gap-1">
                          {metricLabel[m]}
                          <X className="h-3 w-3 cursor-pointer" onClick={()=>setMetrics(prev=>prev.filter(x=>x!==m))} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Compare selectors */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Grid2X2 className="h-4 w-4 text-indigo-600" />
                  Compare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Facet by</div>
                  <Select value={facetBy} onValueChange={(v:FacetMode)=>setFacetBy(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flock">Flocks</SelectItem>
                      <SelectItem value="unit">Hatcheries</SelectItem>
                      <SelectItem value="flock_unit">Flock × Hatchery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Flocks */}
                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">Flocks</div>
                  <Command className="p-0">
                    <CommandInput placeholder="Search flocks…" />
                    <CommandList className="max-h-44 overflow-auto">
                      <CommandEmpty>No flocks.</CommandEmpty>
                      <CommandGroup>
                        {flocksList.map(f=>{
                          const checked = selectedFlocks.includes(f.num);
                          return (
                            <CommandItem
                              key={f.num}
                              value={`#${f.num} ${f.name}`}
                              onSelect={()=>setSelectedFlocks(prev => checked ? prev.filter(x=>x!==f.num) : [...prev, f.num])}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <span className="block w-2 h-2 bg-primary-foreground rounded-sm" />}
                              </div>
                              <span>#{f.num} — {f.name}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>

                {/* Hatcheries */}
                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">Hatcheries</div>
                  <Command className="p-0">
                    <CommandInput placeholder="Search hatcheries…" />
                    <CommandList className="max-h-44 overflow-auto">
                      <CommandEmpty>No hatcheries.</CommandEmpty>
                      <CommandGroup>
                        {units.map(u=>{
                          const checked = selectedUnits.includes(u);
                          return (
                            <CommandItem
                              key={u}
                              value={u}
                              onSelect={()=>setSelectedUnits(prev => checked ? prev.filter(x=>x!==u) : [...prev, u])}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <span className="block w-2 h-2 bg-primary-foreground rounded-sm" />}
                              </div>
                              <span>{u}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              </CardContent>
            </Card>

            {/* Settings + Date Range */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-600" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Time Scale</label>
                  <Select value={granularity} onValueChange={(v:Granularity)=>setGranularity(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Percent aggregation</label>
                  <Select value={percentAgg} onValueChange={(v:PercentAgg)=>setPercentAgg(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted">Weighted</SelectItem>
                      <SelectItem value="unweighted">Unweighted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Benchmark %</label>
                  <Input
                    type="number"
                    placeholder="e.g. 95"
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="rolling" checked={rollingAvg} onCheckedChange={(v)=>setRollingAvg(Boolean(v))}/>
                  <label htmlFor="rolling" className="text-xs text-slate-600">Show rolling average (3 buckets)</label>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-slate-600 mb-1">Date Range</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["30d", 30], ["90d", 90], ["180d", 180], ["365d", 365]
                    ].map(([label, days]) => (
                      <Button
                        key={label as string}
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={()=>{
                          const to = new Date(); const from = new Date(); from.setDate(to.getDate() - (days as number));
                          setDateFrom(from.toISOString().slice(0,10)); setDateTo(to.toISOString().slice(0,10));
                        }}
                      >
                        {label as string}
                      </Button>
                    ))}
                    <Button
                      variant="outline" size="sm" className="h-7"
                      onClick={()=>{
                        const to = new Date(); const from = new Date(to.getFullYear(), 0, 1);
                        setDateFrom(from.toISOString().slice(0,10)); setDateTo(to.toISOString().slice(0,10));
                      }}
                    >
                      YTD
                    </Button>
                    <Button variant="outline" size="sm" className="h-7" onClick={()=>{setDateFrom(""); setDateTo("");}}>
                      All time
                    </Button>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Input type="date" className="h-8" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
                    <Input type="date" className="h-8" value={dateTo}   onChange={(e)=>setDateTo(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Visuals (fixed page, no scroll) */}
        <main className="h-full overflow-hidden">
          <div className="h-full p-3">
            <Card className="h-full shadow-xl border-0 bg-white/90 backdrop-blur flex flex-col">
              <CardHeader className="flex-none pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={()=>setSidebarOpen(v=>!v)}>
                      {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                    </Button>
                    <div>
                      <CardTitle className="text-xl">{VIZ_LABEL[viz]}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {compareMode ? "Side-by-side comparison" : (activeFacetObj?.title || "All flocks")}
                      </p>
                    </div>
                  </div>

                  {/* Controls moved here (right side) */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Button variant={compareMode ? "default" : "outline"} size="sm" className="gap-1"
                        onClick={()=>setCompareMode(v=>!v)}>
                        <LayoutGrid className="h-4 w-4" />
                        {compareMode ? "Compare: On" : "Compare: Off"}
                      </Button>
                      {compareMode && (
                        <Select value={String(compareCols)} onValueChange={(v)=>setCompareCols(Number(v))}>
                          <SelectTrigger className="h-8 w-[110px]"><SelectValue placeholder="Cols" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 col</SelectItem>
                            <SelectItem value="2">2 cols</SelectItem>
                            <SelectItem value="3">3 cols</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <Input placeholder="Save view as…" value={savedName} onChange={(e)=>setSavedName(e.target.value)} className="h-8 w-44" />
                    <Button variant="outline" size="sm" className="gap-1 h-8" onClick={saveCurrentView}><Save className="h-4 w-4" />Save</Button>
                    {savedViews.length>0 && (
                      <Select onValueChange={(v)=>applySavedView(v)}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Load view" /></SelectTrigger>
                        <SelectContent>
                          {savedViews.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {filterCount > 0 && <Badge className="ml-1">{filterCount} filters</Badge>}
                    <Button variant="outline" size="sm" className="gap-2" onClick={exportBucketsCsv}>
                      <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.assign(window.location.pathname)}>
                      <RefreshCw className="h-4 w-4" /> Reset
                    </Button>
                  </div>
                </div>

                {!compareMode && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {(showFertilityMetrics ? [
                      { label: "Total Eggs", value: totalEggs.toLocaleString() },
                      { label: "Avg Fertility", value: `${avgFertility.toFixed(2)}%` },
                      { label: "Avg Hatch", value: `${avgHatch.toFixed(2)}%` },
                      { label: "Avg Mortality", value: `${avgMortality.toFixed(2)}%` },
                    ] : [
                      { label: "Total Eggs", value: totalEggs.toLocaleString() },
                      { label: "Clear Rate", value: `${avgClear.toFixed(2)}%` },
                      { label: "Injection Rate", value: `${avgInj.toFixed(2)}%` },
                      { label: "Average Age", value: `${avgAge.toFixed(1)}w` },
                    ]).map((metric, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-white">
                        <div className="text-xs text-slate-600">{metric.label}</div>
                        <div className="text-lg font-bold">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 min-h-0 pt-0">
                <div className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <>
                      {compareMode ? (
                        <div
                          className="grid gap-3 h-full"
                          style={{ gridTemplateColumns: `repeat(${compareCols}, minmax(0,1fr))` }}
                        >
                          {facets.slice(0, compareCols * 2).map((f) => {
                            const data = chartDataForFacet(f.rows);
                            return (
                              <div key={f.key} className="flex flex-col min-h-0 border rounded-lg">
                                <div className="px-3 py-2 text-xs font-medium border-b bg-slate-50 truncate">{f.title}</div>
                                <div className="flex-1 min-h-0">{renderChart(data, f.title)}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full">{renderChart(activeData, activeFacetObj?.title || "All flocks")}</div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Drill-down modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bucket details</DialogTitle>
            <DialogDescription>{modalTitle}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="py-2 pr-2">Batch</th>
                  <th className="py-2 pr-2">Flock</th>
                  <th className="py-2 pr-2">Hatchery</th>
                  <th className="py-2 pr-2">Set date</th>
                  <th className="py-2 pr-2 text-right">Eggs set</th>
                  <th className="py-2 pr-2 text-right">Clears</th>
                  <th className="py-2 pr-2 text-right">Injected</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {modalRows.map(r=>(
                  <tr key={r.batch_id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono">{r.batch_number}</td>
                    <td className="py-2 pr-2">#{r.flock_number} — {r.flock_name}</td>
                    <td className="py-2 pr-2">{r.unit_name}</td>
                    <td className="py-2 pr-2">{new Date(r.set_date).toLocaleDateString()}</td>
                    <td className="py-2 pr-2 text-right">{r.total_eggs_set?.toLocaleString()}</td>
                    <td className="py-2 pr-2 text-right">{r.eggs_cleared?.toLocaleString()}</td>
                    <td className="py-2 pr-2 text-right">{r.eggs_injected?.toLocaleString()}</td>
                    <td className="py-2 pr-2">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}