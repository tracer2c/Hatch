import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, ChartLine, FileSpreadsheet, AlertTriangle, BarChart3, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EmbrexTimeline } from "@/components/dashboard/EmbrexTimeline";

const ResidueBreakoutSheetPage = () => {
  const [data, setData] = useState<ResidueBreakout[]>([]);
  const [filteredData, setFilteredData] = useState<ResidueBreakout[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'all' | 'selected' | 'compare' | 'timeline'>('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const backToTimelineQS =
  (location.state as any)?.backToTimelineQS ||
  (typeof window !== "undefined" ? sessionStorage.getItem("embrexTimelineQS") : null) ||
  "scale=month&metric=total_eggs_set";

  useEffect(() => {
    document.title = "Residue Breakout Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Residue Breakout Data Sheet."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Residue Breakout Data Sheet.";
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    loadResidueBreakout();
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
          (item.unit_name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

    type ResidueBreakout = {
    batch_id: string;
    batch_number: string;
    flock_number: number;
    flock_name: string;
    age_weeks: number;
    total_eggs_set: number;
    sample_size: number;
    fertile_eggs:number,
    infertile_eggs:number;
    set_date: string;
    status: string;
    unit_name: string | null;
    early_dead: number | null;
    late_dead: number | null;
    fertility_percent: number;
  };

  const loadResidueBreakout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("batches")
        .select(`
          id,
          batch_number,
          total_eggs_set,
          set_date,
          status,
          units ( name ),
          flocks!inner ( flock_number, flock_name, age_weeks ),
          fertility:fertility_analysis!fertility_analysis_batch_id_fkey ( id, sample_size,fertile_eggs, infertile_eggs, early_dead, late_dead, fertility_percent )
        `)
        .order("set_date", { ascending: false });

      if (error) throw error;

      // If there can be multiple fertility rows per batch, pick the one you want.
      // Here we pick the one with the largest id (change logic if you track a date).
      const pickFert = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        return arr.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
      };

      const formatted: ResidueBreakout[] = (data ?? []).map((b: any) => {
        const fert = pickFert(b.fertility);
        return {
          batch_id: b.id,
          batch_number: b.batch_number,
          flock_number: b.flocks?.flock_number,
          flock_name: b.flocks?.flock_name,
          age_weeks: b.flocks?.age_weeks,
          total_eggs_set: b.total_eggs_set,
          set_date: b.set_date,
          status: b.status,
          unit_name: b.units?.name ?? null,
          sample_size: fert?.sample_size,
          infertile_eggs: fert?.infertile_eggs ?? null,
          fertile_eggs: fert?.fertile_eggs ?? null,
          early_dead: fert?.early_dead ?? null,
          late_dead: fert?.late_dead ?? null,
          fertility_percent: fert?.fertility_percent,
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


  const calculatePercentage = (value: number | null, total: number): string => {
    if (value === null || total === 0) return "—";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const exportToCSV = () => {
    const headers = [
      "Flock #",
      "Flock Name", 
      "Unit",
      "Age (weeks)",
      "Batch #",
      "Set Date",
      "Status",
      "Total Eggs",
      "Sample Size",
      "Infertile Eggs",
      "Fertile Eggs",
      "Early Dead",
      "Late Dead",
      "Fertility Percent"
    ];

    const csvData = filteredData.map(item => [
      item.flock_number,
      item.flock_name,
      item.unit_name ?? "—",
      item.age_weeks,
      item.batch_number,
      new Date(item.set_date).toLocaleDateString(),
      item.status,
      item.total_eggs_set,
      item.sample_size,
      item.infertile_eggs,
      item.fertile_eggs,
      item.early_dead,
      item.late_dead,
      item.fertility_percent
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `residue-breakout-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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

    const fmtNum = (n: number | null | undefined) =>
    n == null ? "—" : Number(n).toLocaleString();


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Residue-Breakout</h1>
          <p className="text-muted-foreground">
            Residue Breakout and Embryonic Mortality.
          </p>
        <div className="flex items-center gap-2">
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


      <Tabs value={comparisonMode} onValueChange={(v) => setComparisonMode(v as any)} className="space-y-4">
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Data Summary ({filteredData.length} records)
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search flock name, batch number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="min-h-0">
              <div className="rounded-md border overflow-hidden">
              <div className="relative max-h-[60vh] overflow-auto">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-20 bg-background border-b">
                    <TableRow>
                    {/* <TableHead className="sticky top-0 z-20 bg-background">Select</TableHead> */}
                    <TableHead className="sticky top-0 z-20 bg-background">Flock#</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Flock Name</TableHead>
                    {/* <TableHead className="sticky top-0 z-20 bg-background">Unit</TableHead> */}
                    <TableHead className="sticky top-0 z-20 bg-background">Age (weeks)</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">House#</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Set Date</TableHead>
                    {/* <TableHead className="sticky top-0 z-20 bg-background">Status</TableHead> */}
                    {/* <TableHead className="sticky top-0 z-20 bg-background text-right">Total Eggs</TableHead> */}
                    <TableHead className="sticky top-0 z-20 bg-background text-right">Sample Size</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Infertile Eggs</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Fertile Eggs</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Early Dead</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Late Dead</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Fertility%</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-background">Total Embryonic Mortality</TableHead>
                  </TableRow>
                  </TableHeader>

                  <TableBody>
                {filteredData.map((item) => (
                    <TableRow key={item.batch_id} className="hover:bg-muted/50">
                    {/* Select */}
                    {/* <TableCell>
                        <Checkbox
                        checked={selectedHouses.includes(item.batch_id)}
                        onCheckedChange={(checked) => {
                            const isChecked = checked === true; // shadcn returns boolean | "indeterminate"
                            setSelectedHouses((prev) =>
                            isChecked
                                ? Array.from(new Set([...prev, item.batch_id]))
                                : prev.filter((id) => id !== item.batch_id)
                            );
                        }}
                        />
                    </TableCell> */}

                    {/* Flock info */}
                    <TableCell className="font-medium">{item.flock_number}</TableCell>
                    <TableCell>{item.flock_name}</TableCell>
                    {/* <TableCell>{item.unit_name ?? "—"}</TableCell>  // uncomment if you show Unit column */}

                    {/* Age, Batch # (just “#N”), Set date */}
                    <TableCell>{item.age_weeks}</TableCell>
                    <TableCell>{item.batch_number?.match(/#\d+/)?.[0] ?? ""}</TableCell>
                    <TableCell>{new Date(item.set_date).toLocaleDateString()}</TableCell>

                    {/* Totals & fertility details */}
                    {/* <TableCell className="text-right font-mono">
                        {fmtNum(item.total_eggs_set)}
                    </TableCell> */}
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.sample_size)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.infertile_eggs)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.fertile_eggs)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.early_dead)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.late_dead)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.fertility_percent)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {fmtNum(item.late_dead+ item.early_dead)}
                    </TableCell>
                    </TableRow>
                ))}

                {filteredData.length === 0 && (
                    <TableRow>
                    {/* Update colSpan if you add/remove columns:
                        Select, Flock#, Flock Name, Age, Batch#, Set Date, Total Eggs, Early Dead, Late Dead => 9 */}
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No results found for your search." : "No data available."}
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
                </Table>
              </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default ResidueBreakoutSheetPage;