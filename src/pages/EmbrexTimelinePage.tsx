import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Table as TableIcon } from "lucide-react";
import { Loader2, Calendar as CalendarIcon, RefreshCw, ChevronsUpDown, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";


/** ---------- Types ---------- */
type Granularity = "year" | "month" | "week" | "day";
type ChartMode = "bar" | "line";
type MetricKey =
    | "age_weeks"
    | "total_eggs_set"
    | "eggs_cleared"
    | "eggs_injected"
    | "clear_pct"
    | "injected_pct";

interface RawRow {
    batch_id: string;
    batch_number: string;
    flock_number: number;
    unit_name: string;
    flock_name: string;
    age_weeks: number;
    total_eggs_set: number;
    eggs_cleared: number | null;
    eggs_injected: number | null;
    set_date: string;
    status: string;
}

interface BucketPoint {
    bucketKey: string;
    dateForPlot: Date;
    value: number;
    raw: RawRow[];
}

/** ---------- Helpers (safe to keep outside component) ---------- */
const fmtBucketLabel = (d: Date, g: Granularity) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (g === "year") return `${y}`;
    if (g === "month") return `${y}-${m}`;
    if (g === "week") {
        const start = new Date(y, 0, 1);
        const week = Math.floor((+d - +start) / (7 * 86400000)) + 1;
        return `${y}-W${String(week).padStart(2, "0")}`;
    }
    return `${y}-${m}-${day}`;
};

const startOfBucket = (d: Date, g: Granularity) => {
    const y = d.getFullYear();
    if (g === "year") return new Date(y, 0, 1);
    if (g === "month") return new Date(y, d.getMonth(), 1);
    if (g === "week") {
        const tmp = new Date(d);
        const day = tmp.getDay(); // 0 Sun … 6 Sat
        const diff = (day + 6) % 7; // start Monday
        tmp.setDate(tmp.getDate() - diff);
        tmp.setHours(0, 0, 0, 0);
        return tmp;
    }
    const exact = new Date(d);
    exact.setHours(0, 0, 0, 0);
    return exact;
};

const metricLabel: Record<MetricKey, string> = {
    age_weeks: "Age (weeks)",
    total_eggs_set: "Total Eggs",
    eggs_cleared: "Clears",
    eggs_injected: "Injected",
    clear_pct: "Clear %",
    injected_pct: "Injected %",
};

const ALL_METRICS = [
    "age_weeks", "total_eggs_set", "eggs_cleared", "eggs_injected",
    "clear_pct", "injected_pct",
] as const;
const isMetricKey = (x: string): x is MetricKey =>
    (ALL_METRICS as readonly string[]).includes(x);

const METRIC_PRESETS: Record<string, MetricKey[]> = {
  Counts: ["total_eggs_set","eggs_cleared","eggs_injected"],
  Percentages: ["clear_pct","injected_pct"]
};

const isPercentMetric = (m: MetricKey) =>
    m === "clear_pct" || m === "injected_pct";

const metricKind = (m: MetricKey) => (isPercentMetric(m) ? "pct" : "count") as "pct" | "count";

// validators for URL params
const validScale = (s: any) => ["year", "month", "week", "day"].includes(s);
const validMetric = (m: any) =>
    ["age_weeks", "total_eggs_set", "eggs_cleared", "eggs_injected", "clear_pct", "injected_pct"
    ].includes(m);

/** ---------- Page ---------- */
export default function EmbrexTimelinePage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<RawRow[]>([]);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [compareOpen, setCompareOpen] = useState(false);


    const [chartMode, setChartMode] = useState<"bar" | "line">(
        () => (searchParams.get("view") === "line" ? "line" : "bar")
    );

    // Controls — initialize lazily from URL ONCE
    const [granularity, setGranularity] = useState<Granularity>(() => {
        const s = searchParams.get("scale");
        return validScale(s) ? (s as Granularity) : "month";
    });

    const DEFAULT_METRICS: readonly MetricKey[] = ["total_eggs_set"];

    const [metrics, setMetrics] = useState<MetricKey[]>(() => {
        const m = searchParams.get("metrics") ?? searchParams.get("metric");
        const list: MetricKey[] = m
            ? m.split(",").filter(isMetricKey)                   // type-guard → MetricKey[]
            : [...DEFAULT_METRICS];                              // ensure MetricKey[] (not string[])
        return Array.from(new Set(list)).slice(0, 4);          // unique + cap at 4
    });

    const metric = useMemo<MetricKey>(() => metrics[0] ?? "total_eggs_set", [metrics]);

    const [unitFilter, setUnitFilter] = useState<string>(() => searchParams.get("unit") || "all");

    const units = useMemo(() => {
        const set = new Set<string>();
        rows.forEach(r => { if (r.unit_name) set.add(r.unit_name.trim()); });
        return Array.from(set).sort();
    }, [rows]);

    // Multi-select Units (up to 4); default empty = all units
    const [selectedUnits, setSelectedUnits] = useState<string[]>(() => {
    const u = searchParams.get("units");
    return u ? u.split(",").filter(Boolean).slice(0, 4) : [];
    });

    // Facet mode: how to split small multiples
    type FacetMode = "flock" | "unit" | "flock_unit";
    const [facetBy, setFacetBy] = useState<FacetMode>(() => {
    const f = searchParams.get("facetBy");
    return (f === "unit" || f === "flock_unit") ? f : "flock";
    });

    const DEFAULTS = {
        scale: "month" as Granularity,
        metric: "total_eggs_set" as MetricKey,
        flock: "all",
        from: "",
        to: "",
        view: "bar" as ChartMode,
    };

    const handleReset = () => {
        // reset local state
        setGranularity(DEFAULTS.scale);
        setMetrics([DEFAULTS.metric]);
        setSelectedFlocks([]);
        setUnitFilter("all");
        setSelectedUnits([]);
        setFacetBy("flock");
        setDateFrom(DEFAULTS.from);
        setDateTo(DEFAULTS.to);
        setChartMode(DEFAULTS.view);

        // immediately sync URL + memory (optional but snappy)
        const sp = new URLSearchParams();
        sp.set("scale", DEFAULTS.scale);
        sp.set("metrics", metrics.join(","));
        sp.set("view", DEFAULTS.view);
        setSearchParams(sp, { replace: true });
        sessionStorage.setItem("embrexTimelineQS", sp.toString());
    };

    const toggleFlock = (num: number) => {
        setSelectedFlocks((prev) => {
            const set = new Set(prev);
            if (set.has(num)) set.delete(num);
            else set.add(num);
            return Array.from(set).slice(0, 4);
        });
    };

    const [selectedFlock, setSelectedFlock] = useState<string>(() => searchParams.get("flock") || "all");
    const [dateFrom, setDateFrom] = useState<string>(() => searchParams.get("from") || ""); // yyyy-mm-dd
    const [dateTo, setDateTo] = useState<string>(() => searchParams.get("to") || "");
    // Multi-flock compare (up to 4)
    const [selectedFlocks, setSelectedFlocks] = useState<number[]>(() => {
        const multi = searchParams.get("flocks");
        return multi ? multi.split(",").map(Number).filter(n => !Number.isNaN(n)).slice(0, 4) : [];
    });

    useEffect(() => {
        document.title = "Embrex Timeline | Hatchery Dashboard";
    }, []);

    // keep URL in sync whenever controls change (no navigate() here)
    useEffect(() => {
        const sp = new URLSearchParams();
        sp.set("scale", granularity);
        sp.set("metric", metrics.join(","));
        sp.set("metrics", metrics.join(","));
        if (unitFilter && unitFilter !== "all") sp.set("unit", unitFilter); else sp.delete("unit");
        sp.set("view", chartMode);
        if (selectedFlocks.length > 0) {
            sp.set("flocks", selectedFlocks.join(","));
        } else {
            sp.delete("flocks");
            if (selectedFlock !== "all") sp.set("flock", selectedFlock);
            else sp.delete("flock");
        }
        if (selectedUnits.length) sp.set("units", selectedUnits.join(",")); else sp.delete("units");
        sp.set("facetBy", facetBy);
        if (dateFrom) sp.set("from", dateFrom);
        if (dateTo) sp.set("to", dateTo);
        setSearchParams(sp, { replace: true });
        sessionStorage.setItem("embrexTimelineQS", sp.toString());
    }, [granularity, metrics, chartMode, selectedFlocks, selectedFlock, dateFrom, dateTo, setSearchParams]);

    // Load data
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("batches")
                    .select(`
                    id,
                    batch_number,
                    total_eggs_set,
                    eggs_cleared,
                    eggs_injected,
                    set_date,
                    status,
                    units ( name ),
                    flocks!inner(
                    flock_number,
                    flock_name,
                    age_weeks
                    )
                `)
                    .order("set_date", { ascending: true });

                if (error) throw error;

                const formatted: RawRow[] =
                    (data || []).map((b: any) => {
                        const fert = b.fertility_analysis?.[0] ?? b.fertility_analysis ?? null;
                        return {
                            batch_id: b.id,
                            batch_number: b.batch_number,
                            flock_number: b.flocks.flock_number,
                            unit_name: b.units.name,
                            flock_name: b.flocks.flock_name,
                            age_weeks: b.flocks.age_weeks,
                            total_eggs_set: b.total_eggs_set,
                            eggs_cleared: b.eggs_cleared,
                            eggs_injected: b.eggs_injected,
                            set_date: b.set_date,
                            status: b.status,
                        };
                    }) ?? [];


                setRows(formatted);
            } catch (e) {
                console.error(e);
                toast({
                    title: "Failed to load",
                    description: "Could not load timeline data.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        })();
    }, [toast]);

    // ---------- Your existing memo blocks ----------
    const flocks = useMemo(() => {
        const uniq = new Map<number, string>();
        rows.forEach((r) => {
            if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name);
        });
        return [...uniq.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([num, name]) => ({ value: String(num), label: `#${num} — ${name}` }));
    }, [rows]);

    const flocksMap = useMemo(() => {
        const m = new Map<number, string>();
        rows.forEach((r) => {
            if (!m.has(r.flock_number)) m.set(r.flock_number, r.flock_name);
        });
        return m;
    }, [rows]);

    const baseFilteredRows = useMemo(() => {
    const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
    let out = rows;
    if (unitFilter !== "all") {
        out = out.filter(r => norm(r.unit_name) === norm(unitFilter));
    }
    if (selectedUnits.length) {
    const allow = new Set(selectedUnits.map(u => u.trim().toLowerCase()));
    out = out.filter(r => r.unit_name && allow.has(r.unit_name.trim().toLowerCase()));
    }
    if (dateFrom) {
        const from = new Date(dateFrom);
        out = out.filter(r => new Date(r.set_date) >= from);
    }
    if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        out = out.filter(r => new Date(r.set_date) <= to);
    }
    return out;
    }, [rows, selectedUnits, unitFilter, dateFrom, dateTo]);
   

    // Colors (reuse anywhere)
    const seriesColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"] as const;

    // Build bucketed points for a metric
    const buildPointsForMetric = (subset: RawRow[], m: MetricKey, g: Granularity): BucketPoint[] => {
    const buckets = new Map<string, BucketPoint>();
    for (const r of subset) {
        const d = new Date(r.set_date);
        const start = startOfBucket(d, g);
        const key = fmtBucketLabel(start, g);

        const val = (() => {
        if (m === "clear_pct")         return (!r.eggs_cleared || r.total_eggs_set === 0) ? 0 : (r.eggs_cleared / r.total_eggs_set) * 100;
        if (m === "injected_pct")      return (!r.eggs_injected || r.total_eggs_set === 0) ? 0 : (r.eggs_injected / r.total_eggs_set) * 100;
        return (r as any)[m] ?? 0;
        })();

        if (!buckets.has(key)) buckets.set(key, { bucketKey: key, dateForPlot: start, value: 0, raw: [] });
        const b = buckets.get(key)!;
        b.value += val;
        b.raw.push(r);
    }

    const out: BucketPoint[] = [];
    buckets.forEach((b) => {
        if (isPercentMetric(m)) out.push({ ...b, value: b.value / Math.max(1, b.raw.length) });
        else out.push(b);
    });
    out.sort((a, b) => +a.dateForPlot - +b.dateForPlot);
    return out;
    };

    const formatVal = (m: MetricKey, v: number) =>
    isPercentMetric(m) ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString();


    // Decide which "facets" to render:
    // - None selected => one facet: "All flocks" (aggregated)
    // - Some selected => one facet per flock
    type Facet = { key: string; title: string; rows: RawRow[] };
    const facets: Facet[] = useMemo(() => {
    // Start from baseFilteredRows
    const data = baseFilteredRows;

    if (facetBy === "flock") {
        if (!selectedFlocks.length) {
        return [{ key: "ALL", title: "All flocks", rows: data }];
        }
        return selectedFlocks.map(num => ({
        key: `FLOCK-${num}`,
        title: `Flock #${num} — ${flocksMap.get(num) ?? ""}`,
        rows: data.filter(r => r.flock_number === num),
        }));
    }

    if (facetBy === "unit") {
        const unitList = selectedUnits.length
        ? selectedUnits
        : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[])).slice(0, 4);
        return unitList.map(u => ({
        key: `UNIT-${u}`,
        title: `Unit: ${u}`,
        rows: data.filter(r => (r.unit_name ?? "").toLowerCase() === u.toLowerCase()),
        }));
    }

    // facetBy === "flock_unit"
    const flocks = selectedFlocks.length
        ? selectedFlocks
        : Array.from(new Set(data.map(r => r.flock_number))).slice(0, 2); // sensible default (limit)
    const unitList = selectedUnits.length
        ? selectedUnits
        : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[])).slice(0, 2);

    const out: Facet[] = [];
    for (const num of flocks) {
        for (const u of unitList) {
        out.push({
            key: `FLOCK-${num}-UNIT-${u}`,
            title: `Flock #${num} — ${flocksMap.get(num) ?? ""} • Unit: ${u}`,
            rows: data.filter(r =>
            r.flock_number === num &&
            (r.unit_name ?? "").toLowerCase() === u.toLowerCase()
            ),
        });
        }
    }
    // If nothing selected and cartesian is empty (rare), fall back to one facet
    return out.length ? out : [{ key: "ALL", title: "All flocks", rows: data }];
    }, [facetBy, baseFilteredRows, selectedFlocks, selectedUnits, flocksMap]);


    // Per-facet series (multi-metric overlay)
    type OverlaySeries = { metric: MetricKey; kind: "pct" | "count"; points: BucketPoint[] };
    const facetSeries = (rowsForFacet: RawRow[]): OverlaySeries[] =>
    metrics.map((m) => ({
        metric: m,
        kind: metricKind(m),
        points: buildPointsForMetric(rowsForFacet, m, granularity),
    }));

    // Compute Y ranges per facet (dual axis)
    const facetRanges = (seriesList: OverlaySeries[]) => {
    const countVals = seriesList.filter(s => s.kind === "count").flatMap(s => s.points.map(p => p.value));
    const pctVals   = seriesList.filter(s => s.kind === "pct").flatMap(s => s.points.map(p => p.value));
    const countMin = countVals.length ? Math.min(0, ...countVals) : 0;
    const countMax = countVals.length ? Math.max(1, ...countVals) : 1;
    const pctMin = 0;
    const pctMax = pctVals.length ? Math.max(100, ...pctVals) : 100;
    return { countMin, countMax, pctMin, pctMax };
    };

    const svgWidth = Math.max(640, facets.length * 140);
    const railY = 210;
    const leftPad = 56;
    const rightPad = 40;

    // space so the top circle + value label are visible, and bottom labels too
    const TOP_PAD = 40;
    const BOTTOM_PAD = 60;
    // your railY is still 210 from above; total canvas height needs both paddings
    const svgHeight = railY + TOP_PAD + BOTTOM_PAD;

    const xAt = (i: number) => {
        const usable = svgWidth - leftPad - rightPad;
        if (facets.length <= 1) return leftPad + usable / 2;
        return leftPad + (usable * i) / (facets.length - 1);
    };

    /** ---------- Render ---------- */
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Embrex Timeline</h1>
                    <p className="text-muted-foreground">
                        Displays {metricLabel[metric]} over time by flock and time scale
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleReset}
                        title="Refresh Timeline"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                    </Button>

                    <Button className="gap-2" variant="secondary" onClick={() =>
                        navigate("/embrex-data-sheet", { state: { backToTimelineQS: searchParams.toString() } })}>
                        <TableIcon className="h-4 w-4" />
                        Embrex Summary
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Controls</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-5">
                {/* Compare flocks (up to 4) */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm text-muted-foreground">Compare flocks (up to 4)</label>
                        <Popover open={compareOpen} onOpenChange={setCompareOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={compareOpen}
                                    className="inline-flex w-auto items-center justify-between pl-3 pr-5"
                                    title="Select up to 4 flocks to compare"
                                >
                                    {selectedFlocks.length ? `${selectedFlocks.length} selected` : "Select flocks to compare"}
                                  
                                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                    
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-[320px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search flocks..." />
                                    <CommandEmpty>No flocks found.</CommandEmpty>
                                    <CommandList>
                                        <CommandGroup>
                                            {flocks.map((f) => {
                                                const num = Number(f.value);
                                                const checked = selectedFlocks.includes(num);
                                                const atLimit = selectedFlocks.length >= 4;
                                                const disabled = !checked && atLimit;

                                                return (
                                                    <CommandItem
                                                        key={f.value}
                                                        value={f.label}
                                                        onSelect={() => {
                                                            if (disabled) return; // enforce 4 max
                                                            toggleFlock(num);
                                                        }}
                                                        className={disabled ? "opacity-50 pointer-events-none" : ""}
                                                    >
                                                        {/* custom checkbox visual */}
                                                        <div
                                                            className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"
                                                                }`}
                                                        >
                                                            {checked && <Check className="h-3 w-3" />}
                                                        </div>
                                                        <span>{f.label}</span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>

                                <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between">
                                    <span>{selectedFlocks.length}/4 selected</span>
                                    {selectedFlocks.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 gap-1"
                                            onClick={() => setSelectedFlocks([])}
                                        >
                                            <X className="h-3 w-3" />
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* {selectedFlocks.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Showing {selectedFlocks.length} flock{selectedFlocks.length > 1 ? "s" : ""}. Y-scale aligned for comparison.
                            </p>
                        )} */}
                    </div>

                    {/* Compare Units (up to 4) */}
                    <div className="flex flex-col space-y-1">
                    <label className="text-sm text-muted-foreground">Compare units (up to 4)</label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            {selectedUnits.length ? `${selectedUnits.length} selected` : "Select units"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0">
                        <Command>
                            <CommandInput placeholder="Search units..." />
                            <CommandEmpty>No units found.</CommandEmpty>
                            <CommandList>
                            <CommandGroup>
                                {units.map(u => {
                                const checked = selectedUnits.includes(u);
                                const atLimit = selectedUnits.length >= 4;
                                const disabled = !checked && atLimit;
                                return (
                                    <CommandItem
                                    key={u}
                                    value={u}
                                    onSelect={() => {
                                        if (disabled) return;
                                        setSelectedUnits(prev => checked ? prev.filter(x => x !== u) : [...prev, u]);
                                    }}
                                    className={disabled ? "opacity-50 pointer-events-none" : ""}
                                    >
                                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                        {checked && <Check className="h-3 w-3" />}
                                    </div>
                                    <span>{u}</span>
                                    </CommandItem>
                                );
                                })}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        <div className="border-t p-2 text-xs text-muted-foreground">
                            {selectedUnits.length}/4 selected
                        </div>
                        </PopoverContent>
                    </Popover>
                    </div>

                    {/* Facet by */}
                    <div className="flex flex-col space-y-1">
                    <label className="text-sm text-muted-foreground">Facet by</label>
                    <Select value={facetBy} onValueChange={(v: FacetMode) => setFacetBy(v)}>
                        <SelectTrigger><SelectValue placeholder="Facet by" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="flock">Flocks</SelectItem>
                        <SelectItem value="unit">Units</SelectItem>
                        <SelectItem value="flock_unit">Flock × Unit</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>


                    {/* Unit filter */}
                    {/* <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Unit</label>
                        <Select value={unitFilter} onValueChange={setUnitFilter}>
                            <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All units</SelectItem>
                                {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div> */}

                     {/* Metrics (multi, up to 4) */}
                    <div className="flex flex-col space-y-1">
                    <label className="text-sm text-muted-foreground">Metrics (up to 4)</label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        className="inline-flex justify-between items-center gap-2 px-3"
                        >
                        <span className="truncate">
                            {metrics.length
                            ? metrics.map(m => metricLabel[m]).join(", ")
                            : "Select metrics"}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-0">
                        <div className="p-2 flex gap-2">
                            {Object.entries(METRIC_PRESETS).map(([name, preset]) => (
                            <Button
                                key={name}
                                size="sm"
                                variant="secondary"
                                onClick={() => setMetrics(preset.slice(0,4))}
                            >
                                {name}
                            </Button>
                            ))}
                            <Button size="sm" variant="ghost" onClick={() => setMetrics([])}>Clear</Button>
                        </div>
                        <Command>
                            <CommandInput placeholder="Search metrics..." />
                            <CommandEmpty>No metrics found.</CommandEmpty>
                            <CommandList>
                            <CommandGroup>
                                {ALL_METRICS.map((m) => {
                                const checked = metrics.includes(m);
                                const atLimit = metrics.length >= 4;
                                const disabled = !checked && atLimit;
                                return (
                                    <CommandItem
                                    key={m}
                                    value={m}
                                    onSelect={() => {
                                        if (disabled) return;
                                        setMetrics(prev => checked ? prev.filter(x => x !== m) : [...prev, m]);
                                    }}
                                    className={disabled ? "opacity-50 pointer-events-none" : ""}
                                    >
                                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                        {checked && <Check className="h-3 w-3" />}
                                    </div>
                                    <span>{metricLabel[m]}</span>
                                    </CommandItem>
                                );
                                })}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        <div className="border-t p-2 text-xs text-muted-foreground">
                            {metrics.length}/4 selected
                        </div>
                        </PopoverContent>
                    </Popover>
                    </div>


                    {/* Time scale */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm text-muted-foreground">Time scale</label>
                        <Select value={granularity} onValueChange={(v: Granularity) => setGranularity(v)}>
                            <SelectTrigger><SelectValue placeholder="Granularity" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="year">Years</SelectItem>
                                <SelectItem value="month">Months</SelectItem>
                                <SelectItem value="week">Weeks</SelectItem>
                                <SelectItem value="day">Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* View (dropdown) */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm text-muted-foreground">View</label>
                        <Select value={chartMode} onValueChange={(v: "bar" | "line") => setChartMode(v)}>
                            <SelectTrigger><SelectValue placeholder="View" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="line">Line</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date range */}
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" /> Date range
                        </label>
                        <div className="flex items-center gap-2">
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" />
                        </div>
                        <p className="text-xs text-muted-foreground">Leave blank to include all dates.</p>
                    </div>

                </CardContent>
            </Card>

            <Card>
               <CardHeader>
  <CardTitle className="text-lg">
    Timeline ({facets.length} {facets.length === 1 ? "view" : "views"})
  </CardTitle>
</CardHeader>
<CardContent>
  {loading ? (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  ) : (
    <>
      {facets.length === 0 || facets.every(f => f.rows.length === 0) ? (
        <div className="text-muted-foreground">No data for the current filters.</div>
      ) : (
        <div className={`grid gap-6 ${facets.length > 1 ? "md:grid-cols-2" : ""}`}>
          {facets.map((facet) => {
            const seriesList = facetSeries(facet.rows);
            const ranges = facetRanges(seriesList);

            // geometry
            const firstLen = seriesList[0]?.points.length ?? 0;
            const svgW = Math.max(480, firstLen * 100);
            const left = 56, right = 40;
            const baselineY = 210;
            const TOP_PAD = 56, BOTTOM_PAD = 60;
            const svgH = baselineY + TOP_PAD + BOTTOM_PAD;

            const xAtLocal = (i: number) => {
              const usable = svgW - left - right;
              const len = firstLen;
              if (len <= 1) return left + usable / 2;
              return left + (usable * i) / (len - 1);
            };

            const scaleCount = (v: number) => {
              const { countMin, countMax } = ranges;
              const H = 160, base = 30;
              if (countMax === countMin) return 90;
              const t = (v - countMin) / (countMax - countMin);
              return base + t * H;
            };
            const scalePct = (v: number) => {
              const { pctMin, pctMax } = ranges;
              const H = 160, base = 30;
              const t = (v - pctMin) / (pctMax - pctMin);
              return base + t * H;
            };

            // clustered bars params (when chartMode === "bar")
            const groupCount = Math.max(1, seriesList.length);
            const spacing = firstLen > 1
              ? Math.abs(
                  (left + ((svgW - left - right) * 1) / (firstLen - 1)) -
                  (left + ((svgW - left - right) * 0) / (firstLen - 1))
                )
              : (svgW - left - right);
            const groupWidth = Math.min(56, spacing * 0.65); // width allotted for a bucket
            const barGap = 4;
            const barWidth = Math.max(6, Math.min(18, (groupWidth - (groupCount - 1) * barGap) / groupCount));

            return (
              <Card key={facet.key} className="overflow-x-auto">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{facet.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {metrics.map(m => metricLabel[m]).join(", ")} • {granularity} • {unitFilter === "all" ? "All units" : unitFilter}
                  </p>
                </CardHeader>
                <CardContent>
                  <svg width={svgW} height={svgH} style={{ overflow: "visible" }} className="min-w-full">
                    <g transform={`translate(0, ${TOP_PAD})`}>
                      {/* baseline */}
                      <line
                        x1={left}
                        y1={baselineY}
                        x2={svgW - right}
                        y2={baselineY}
                        stroke="#CBD5E1"
                        strokeWidth={2}
                        shapeRendering="crispEdges"
                      />

                      {chartMode === "line" ? (
                        // --------- LINE: multi-metric overlay ---------
                        <g>
                          {seriesList.map((s, idx) => {
                            const color = seriesColors[idx % seriesColors.length];
                            const coords = s.points.map((p, i) => ({
                              x: xAtLocal(i),
                              y: baselineY - (s.kind === "pct" ? scalePct(p.value) : scaleCount(p.value)),
                              label: fmtBucketLabel(p.dateForPlot, granularity),
                              val: p.value,
                              key: p.bucketKey,
                            }));
                            const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                            return (
                              <g key={`${facet.key}-${s.metric}`}>
                                <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                                {coords.map((c) => {
                                const text = formatVal(s.metric, c.val);
                                const yLabel = Math.max(12, c.y - 8); // avoid clipping at top
                                return (
                                    <g key={c.key}>
                                    <circle cx={c.x} cy={c.y} r={3} fill={color} />
                                    {/* outline text for contrast */}
                                    <text
                                        x={c.x}
                                        y={yLabel}
                                        textAnchor="middle"
                                        fontSize={12}
                                        stroke="#fff"
                                        strokeWidth={3}
                                        paintOrder="stroke"
                                        className="fill-foreground"
                                        style={{ pointerEvents: "none" }}
                                    >
                                        {text}
                                    </text>
                                    {/* fill text on top */}
                                    <text
                                        x={c.x}
                                        y={yLabel}
                                        textAnchor="middle"
                                        fontSize={12}
                                        className="fill-foreground"
                                        style={{ pointerEvents: "none" }}
                                    >
                                        {text}
                                    </text>
                                    </g>
                                );
                                })}
                              </g>
                            );
                          })}

                          {/* bucket labels using first series */}
                          {seriesList[0]?.points.map((p, i) => (
                            <text key={p.bucketKey} x={xAtLocal(i)} y={baselineY + 36} textAnchor="middle" fontSize={13} className="fill-muted-foreground">
                              {fmtBucketLabel(p.dateForPlot, granularity)}
                            </text>
                          ))}
                        </g>
                      ) : (
                        // --------- BAR: clustered by metric with same colors ---------
                        <g>
                          {/* for each bucket index, render a cluster of bars */}
                          {(seriesList[0]?.points ?? []).map((p0, i) => {
                            const xCenter = xAtLocal(i);
                            const xStart = xCenter - groupWidth / 2;
                            return (
                              <g key={`bucket-${p0.bucketKey}`}>
                                {seriesList.map((s, idx) => {
                                  const color = seriesColors[idx % seriesColors.length];
                                  const p = s.points[i]; // aligned by index
                                  const val = p?.value ?? 0;
                                  const h = (s.kind === "pct" ? scalePct(val) : scaleCount(val));
                                  const topY = baselineY - h;
                                  const x = xStart + idx * (barWidth + barGap);
                                  return (
                                    <g key={`${facet.key}-${s.metric}-${i}`} tabIndex={0}>
                                        <rect
                                        x={x}
                                        y={topY}
                                        width={barWidth}
                                        height={h}
                                        fill={color}
                                        opacity={0.9}
                                        rx={4}
                                        ry={4}
                                        />
                                        {/* value label above bar */}
                                        <text
                                        x={x + barWidth / 2}
                                        y={Math.max(12, topY - 6)}
                                        textAnchor="middle"
                                        fontSize={12}
                                        stroke="#fff"
                                        strokeWidth={3}
                                        paintOrder="stroke"
                                        className="fill-foreground"
                                        style={{ pointerEvents: "none" }}
                                        >
                                        {formatVal(s.metric, val)}
                                        </text>
                                        <text
                                        x={x + barWidth / 2}
                                        y={Math.max(12, topY - 6)}
                                        textAnchor="middle"
                                        fontSize={12}
                                        className="fill-foreground"
                                        style={{ pointerEvents: "none" }}
                                        >
                                        {formatVal(s.metric, val)}
                                        </text>
                                    </g>
                                    );

                                })}
                                {/* bucket label once per cluster */}
                                <text x={xCenter} y={baselineY + 36} textAnchor="middle" fontSize={13} className="fill-muted-foreground">
                                  {fmtBucketLabel(p0.dateForPlot, granularity)}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      )}
                    </g>
                  </svg>

                  {/* facet legend */}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {seriesList.map((s, idx) => (
                      <span key={`${facet.key}-legend-${s.metric}`} className="inline-flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: seriesColors[idx % seriesColors.length] }} />
                        {metricLabel[s.metric]} {isPercentMetric(s.metric) ? "(%)" : ""}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  )}
</CardContent>

               
            </Card>
        </div>
    );
}