import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Download,
  ChartLine,
  FileSpreadsheet,
  Percent,
  AlertTriangle,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmbrexTimeline } from "@/components/dashboard/EmbrexTimeline";
import { Switch } from "@/components/ui/switch"; // shadcn switch

type CompleteData = {
  batch_id: string;
  batch_number: string;
  flock_number: number;
  flock_name: string;
  age_weeks: number;
  total_eggs_set: number;
  eggs_cleared: number | null;
  eggs_injected: number | null;
  sample_size: number;
  fertile_eggs: number;
  infertile_eggs: number;
  set_date: string;
  status: string;
  unit_name: string | null;
  early_dead: number | null;
  late_dead: number | null;
  fertility_percent: number;
  cracked: number;
  dirty: number;
  small: number;
  large: number;
};

// NEW: column config + tab keys
// -------------- Types ----------------------
type TabKey = "all" | "embrex" | "fertility" | "eggpack" | "hatch";
type Align = "left" | "right" | "center";
type Column = {
  key: string;
  header: string;
  align?: Align;
  render?: (row: CompleteData, showPercent: boolean) => React.ReactNode;
  // If numeric, provide a base value accessor:
  value?: (row: CompleteData) => number | null | undefined;
  // If set, when showPercent=true we compute (value/denom)*100
  denom?: (row: CompleteData) => number | null | undefined;
  // If true, the column is already a % metric; toggle does NOT change it.
  fixedPercent?: boolean;
};

const CompleteDataSheetPage = () => {
  const [data, setData] = useState<CompleteData[]>([]);
  const [filteredData, setFilteredData] = useState<CompleteData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  // CHANGED: active tab (was comparisonMode)
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showPercent, setShowPercent] = useState<boolean>(false);
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<
    "all" | "selected" | "compare" | "timeline"
  >("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const backToTimelineQS =
    (location.state as any)?.backToTimelineQS ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("embrexTimelineQS")
      : null) ||
    "scale=month&metric=total_eggs_set";

  useEffect(() => {
    document.title = "Complete Data Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Complete Data Sheet.");
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Complete Data Data Sheet.";
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    loadCompleteData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter(
        (item) =>
          item.flock_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.flock_number.toString().includes(searchTerm) ||
          (item.unit_name ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  // --------------- Data fetch ---------------
  const loadCompleteData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `
          id,
          batch_number,
          total_eggs_set,
          eggs_cleared,
          eggs_injected,
          set_date,
          status,
          units ( name ),
          flocks!inner ( flock_number, flock_name, age_weeks ),
          egg_pack_quality (cracked, dirty, small, large),
          fertility:fertility_analysis!fertility_analysis_batch_id_fkey ( id, sample_size,fertile_eggs, infertile_eggs, early_dead, late_dead, fertility_percent )
        `
        )
        .order("set_date", { ascending: false });

      if (error) throw error;

      // If there can be multiple fertility rows per batch, pick the one you want.
      // Here we pick the one with the largest id (change logic if you track a date).
      const pickData = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        return arr.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
      };

      const formatted: CompleteData[] = (data ?? []).map((b: any) => {
        const fert = pickData(b.fertility);
        const egg_pk_qlty = pickData(b.egg_pack_quality);
        return {
          batch_id: b.id,
          batch_number: b.batch_number,
          flock_number: b.flocks?.flock_number,
          flock_name: b.flocks?.flock_name,
          age_weeks: b.flocks?.age_weeks,
          total_eggs_set: b.total_eggs_set,
          eggs_cleared: b.eggs_cleared,
          eggs_injected: b.eggs_injected,
          set_date: b.set_date,
          status: b.status,
          unit_name: b.units?.name ?? null,
          sample_size: fert?.sample_size,
          infertile_eggs: fert?.infertile_eggs ?? null,
          fertile_eggs: fert?.fertile_eggs ?? null,
          early_dead: fert?.early_dead ?? null,
          late_dead: fert?.late_dead ?? null,
          fertility_percent: fert?.fertility_percent,
          cracked: egg_pk_qlty?.cracked ?? null,
          dirty: egg_pk_qlty?.dirty ?? null,
          small: egg_pk_qlty?.small ?? null,
          large: egg_pk_qlty?.large ?? null,
        };
      });

      setData(formatted);
      setFilteredData(formatted);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load Residue data sheet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== Helpers & metrics =====

  const fmtNum = (n: number | null | undefined) =>
    n == null ? "—" : Number(n).toLocaleString();

  const fmtPct = (p: number | null) => (p == null ? "—" : `${p.toFixed(1)}%`);

  const nz = (n: number | null | undefined) => n ?? 0;

  const hatchCount = (item: CompleteData) => {
    const hatch =
      nz(item.fertile_eggs) - (nz(item.early_dead) + nz(item.late_dead));
    return Math.max(0, hatch);
  };

  const hatchPct = (item: CompleteData) => {
    const denom = nz(item.sample_size);
    if (denom <= 0) return null;
    return (hatchCount(item) / denom) * 100;
  };

  const hofPct = (item: CompleteData) => {
    const denom = nz(item.fertile_eggs);
    if (denom <= 0) return null;
    return (hatchCount(item) / denom) * 100;
  };

  // --------------- Column rendering engine ---------------
  const renderCell = (col: Column, row: CompleteData, percentMode: boolean) => {
    if (col.render) return col.render(row, percentMode);

    // fixedPercent columns remain percent regardless of toggle
    if (col.fixedPercent && col.value) {
      const val = col.value(row);
      return fmtPct(val == null ? null : Number(val));
    }

    if (col.value) {
      const raw = col.value(row);
      if (!percentMode || !col.denom) return fmtNum(raw);
      const denom = col.denom(row);
      if (!denom || denom <= 0 || raw == null) return "—";
      return fmtPct((Number(raw) / Number(denom)) * 100);
    }

    return "—";
  };

  const weeksSince = (setDateInput: string | Date | null | undefined) => {
    if (!setDateInput) return "—";
    const set = new Date(setDateInput);
    if (isNaN(+set)) return "—";

    // Compare at midnight UTC to avoid DST/timezone off-by-one
    const toUTC = (d: Date) =>
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date();

    const days = Math.floor((toUTC(today) - toUTC(set)) / 86_400_000);
    if (days < 0) return 0; // not started yet
    return Math.floor(days / 7) + 1; // 0–6 days => 1, 7–13 => 2, etc.
  };

  // ===== Column sets per tab =====
  const COMMON_LEFT: Column[] = [
    { key: "flock_number", header: "Flock#", render: (r) => r.flock_number },
    { key: "flock_name", header: "Flock Name", render: (r) => r.flock_name },
    { key: "age_weeks", header: "Age (weeks)", render: (r) => r.age_weeks },
    {
      key: "batch_number",
      header: "House#",
      render: (r) => r.batch_number?.match(/#\d+/)?.[0] ?? "",
    },
    {
      key: "set_date",
      header: "Set Date",
      render: (r) => new Date(r.set_date).toLocaleDateString(),
    },
    {
      key: "week",
      header: "Week",
      align: "right",
      render: (r) => weeksSince(r.set_date),
    },
  ];

  const ALL_COLUMNS: Column[] = [
    ...COMMON_LEFT,
    {
      key: "total_eggs_set",
      header: "Total eggs",
      align: "right",
      render: (r) => fmtNum(r.total_eggs_set),
    },
    {
      key: "eggs_cleared",
      header: "Clears",
      align: "right",
      value: (r) => r.eggs_cleared,
      denom: (r) => r.total_eggs_set,
    },
    {
      key: "eggs_injected",
      header: "Injected",
      align: "right",
      value: (r) => r.eggs_injected,
      denom: (r) => r.total_eggs_set,
    },
    {
      key: "sample_size",
      header: "Sample Size",
      align: "right",
      render: (r) => fmtNum(r.sample_size),
    },
    {
      key: "infertile_eggs",
      header: "Infertile Eggs",
      align: "right",
      value: (r) => r.infertile_eggs,
      denom: (r) => r.sample_size,
    },
    {
      key: "fertile_eggs",
      header: "Fertile Eggs",
      align: "right",
      value: (r) => r.fertile_eggs,
      denom: (r) => r.sample_size,
    },
    {
      key: "early_dead",
      header: "Early Dead",
      align: "right",
      value: (r) => r.early_dead,
      denom: (r) => r.sample_size,
    },
    {
      key: "late_dead",
      header: "Late Dead",
      align: "right",
      value: (r) => r.late_dead,
      denom: (r) => r.sample_size,
    },
    {
      key: "fertility_percent",
      header: "Fertility%",
      align: "right",
      render: (r) => fmtPct(r.fertility_percent),
    },
    {
      key: "hatch",
      header: "Hatch",
      align: "right",
      render: (r) => fmtNum(hatchCount(r)),
    },
    {
      key: "hatch_pct",
      header: "Hatch %",
      align: "right",
      render: (r) => fmtPct(hatchPct(r)),
    },
    {
      key: "hof_pct",
      header: "Hatch Over Fertile %",
      align: "right",
      render: (r) => fmtPct(hofPct(r)),
    },
    {
      key: "embryo_mort",
      header: "Embryonic Mortality",
      align: "center",
      value: (r) => nz(r.early_dead) + nz(r.late_dead),
      denom: (r) => r.sample_size,
    },
    {
      key: "cracked",
      header: "Cracked",
      align: "right",
      value: (r) => r.cracked,
      denom: (r) => r.sample_size,
    },
    {
      key: "dirty",
      header: "Dirty",
      align: "right",
      value: (r) => r.dirty,
      denom: (r) => r.sample_size,
    },
    {
      key: "small",
      header: "Small",
      align: "right",
      value: (r) => r.small,
      denom: (r) => r.sample_size,
    },
    {
      key: "large",
      header: "Large",
      align: "right",
      value: (r) => r.large,
      denom: (r) => r.sample_size,
    },
  ];

  const FERTILITY_COLUMNS: Column[] = [
    ...COMMON_LEFT,
    {
      key: "sample_size",
      header: "Sample Size",
      align: "right",
      render: (r) => fmtNum(r.sample_size),
    },
    {
      key: "infertile_eggs",
      header: "Infertile Eggs",
      align: "right",
      value: (r) => r.infertile_eggs,
      denom: (r) => r.sample_size,
    },
    {
      key: "fertile_eggs",
      header: "Fertile Eggs",
      align: "right",
      value: (r) => r.fertile_eggs,
      denom: (r) => r.sample_size,
    },
    {
      key: "early_dead",
      header: "Early Dead",
      align: "right",
      value: (r) => r.early_dead,
      denom: (r) => r.sample_size,
    },
    {
      key: "late_dead",
      header: "Late Dead",
      align: "right",
      value: (r) => r.late_dead,
      denom: (r) => r.sample_size,
    },
    {
      key: "fertility_percent",
      header: "Fertility%",
      align: "right",
      render: (r) => fmtPct(r.fertility_percent),
    },
    {
      key: "embryo_mort",
      header: "Total Embryonic Mortality",
      align: "center",
      value: (r) => nz(r.early_dead) + nz(r.late_dead),
      denom: (r) => r.sample_size,
    },
  ];

  const EGG_PACK_COLUMNS: Column[] = [
    ...COMMON_LEFT,
    {
      key: "cracked",
      header: "Cracked",
      align: "right",
      value: (r) => r.cracked,
      denom: (r) => r.sample_size,
    },
    {
      key: "dirty",
      header: "Dirty",
      align: "right",
      value: (r) => r.dirty,
      denom: (r) => r.sample_size,
    },
    {
      key: "small",
      header: "Small",
      align: "right",
      value: (r) => r.small,
      denom: (r) => r.sample_size,
    },
    {
      key: "large",
      header: "Large",
      align: "right",
      value: (r) => r.large,
      denom: (r) => r.sample_size,
    },
  ];

  const EMBREX_DATA: Column[] = [
    ...COMMON_LEFT,
    {
      key: "total_eggs_set",
      header: "Total eggs",
      align: "right",
      render: (r) => fmtNum(r.total_eggs_set),
    },
    {
      key: "eggs_cleared",
      header: "Clears",
      align: "right",
      value: (r) => r.eggs_cleared,
      denom: (r) => r.total_eggs_set,
    },
    {
      key: "eggs_injected",
      header: "Injected",
      align: "right",
      value: (r) => r.eggs_injected,
      denom: (r) => r.total_eggs_set,
    },
  ];

  const HATCH_COLUMNS: Column[] = [
    ...COMMON_LEFT,
    {
      key: "sample_size",
      header: "Sample Size",
      align: "right",
      render: (r) => fmtNum(r.sample_size),
    },
    {
      key: "hatch",
      header: "Hatch",
      align: "right",
      render: (r) => fmtNum(hatchCount(r)),
    },
    {
      key: "hatch_pct",
      header: "Hatch %",
      align: "right",
      render: (r) => fmtPct(hatchPct(r)),
    },
    {
      key: "hof_pct",
      header: "Hatch Over Fertile %",
      align: "right",
      render: (r) => fmtPct(hofPct(r)),
    },
  ];

  const TAB_CONFIG: Record<TabKey, { title: string; columns: Column[] }> = {
    all: { title: "Data Summary", columns: ALL_COLUMNS },
    embrex: { title: "Embrex Data", columns: EMBREX_DATA },
    fertility: { title: "Fertility Analysis", columns: FERTILITY_COLUMNS },
    eggpack: { title: "Egg Pack Quality", columns: EGG_PACK_COLUMNS },
    hatch: { title: "Hatch Performance", columns: HATCH_COLUMNS },
  };

  // Export respects active tab's visible columns
  const exportToCSV = () => {
    const { columns } = TAB_CONFIG[activeTab];
    const headers = columns.map((c) => c.header);

    const rows = filteredData.map((row) =>
      columns
        .map((c) => {
          let text: string;
          if (c.render) {
            // Try to stringify render output (dates/weeks). Best-effort.
            const rendered = c.render(row, showPercent);
            text =
              typeof rendered === "string" || typeof rendered === "number"
                ? String(rendered)
                : (() => {
                    // fallback to value/denom if possible
                    if (c.value) {
                      if (c.fixedPercent)
                        return fmtPct(
                          c.value(row) as number | null | undefined
                        );
                      if (showPercent && c.denom) {
                        const v = c.value(row);
                        const d = c.denom(row);
                        text =
                          !d || d <= 0 || v == null
                            ? "—"
                            : fmtPct((Number(v) / Number(d)) * 100);
                      } else {
                        text = fmtNum(c.value(row));
                      }
                      return text;
                    }
                    return "";
                  })();
          } else if (c.value) {
            if (c.fixedPercent) {
              text = fmtPct(c.value(row) as number | null | undefined);
            } else if (showPercent && c.denom) {
              const v = c.value(row);
              const d = c.denom(row);
              text =
                !d || d <= 0 || v == null
                  ? "—"
                  : fmtPct((Number(v) / Number(d)) * 100);
            } else {
              text = fmtNum(c.value(row));
            }
          } else {
            text = "";
          }
          // CSV escaping
          return `"${String(text).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complete-data-${activeTab}-${
      showPercent ? "percent" : "counts"
    }-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Generic table for any column config
  const ConfigTable = ({
    rows,
    columns,
  }: {
    rows: CompleteData[];
    columns: Column[];
  }) => (
    <div className="rounded-md border overflow-hidden">
      <div className="relative max-h-[60vh] overflow-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-20 bg-background border-b">
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={`sticky top-0 z-20 bg-background ${
                    c.align === "right"
                      ? "text-right"
                      : c.align === "center"
                      ? "text-center"
                      : ""
                  }`}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.batch_id} className="hover:bg-muted/50">
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={`${
                      c.align === "right"
                        ? "text-right font-mono"
                        : c.align === "center"
                        ? "text-center font-mono"
                        : ""
                    }`}
                  >
                    {renderCell(c, item, showPercent)}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchTerm
                    ? "No results found for your search."
                    : "No data available."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // --------------- Loading ---------------
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // --------------- Render ---------------
  const activeConfig = TAB_CONFIG[activeTab];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Complete Data</h1>
        <p className="text-muted-foreground">Complete Datasheet.</p>

        <div className="flex items-center gap-3">
          {/* Counts ↔ Percent toggle */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
            <Percent className="h-4 w-4" />
            <span className="text-sm">Show percentages</span>
            <Switch checked={showPercent} onCheckedChange={setShowPercent} />
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              navigate(`/embrex-timeline?${backToTimelineQS}&scope=breakout`, {
                state: { scope: "breakout" },
              })
            }
            title="Open Timeline"
          >
            <ChartLine className="h-4 w-4" />
            Timeline View
          </Button>

          <Button onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* NEW: Tabs List */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="embrex">Embrex Data</TabsTrigger>
            <TabsTrigger value="fertility">Residue Breakout</TabsTrigger>
            <TabsTrigger value="eggpack">Egg Pack Quality</TabsTrigger>
            <TabsTrigger value="hatch">Hatch Performance</TabsTrigger>
          </TabsList>

          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flock name, batch number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* All */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                {activeConfig.title} ({filteredData.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigTable
                rows={filteredData}
                columns={TAB_CONFIG.all.columns}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embrex Data */}
        <TabsContent value="embrex" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embrex Data ({filteredData.length} records)</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigTable
                rows={filteredData}
                columns={TAB_CONFIG.embrex.columns}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fertility */}
        <TabsContent value="fertility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Fertility Analysis ({filteredData.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigTable
                rows={filteredData}
                columns={TAB_CONFIG.fertility.columns}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Egg Pack */}
        <TabsContent value="eggpack" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Egg Pack Quality ({filteredData.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigTable
                rows={filteredData}
                columns={TAB_CONFIG.eggpack.columns}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hatch */}
        <TabsContent value="hatch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Hatch Performance ({filteredData.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigTable
                rows={filteredData}
                columns={TAB_CONFIG.hatch.columns}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompleteDataSheetPage;
