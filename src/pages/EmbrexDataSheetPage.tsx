import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, FileSpreadsheet, AlertTriangle, BarChart3, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EmbrexTimeline } from "@/components/dashboard/EmbrexTimeline";

interface EmbrexData {
  batch_id: string;
  batch_number: string;
  flock_number: number;
  flock_name: string;
  age_weeks: number;
  total_eggs_set: number;
  eggs_cleared: number | null;
  eggs_injected: number | null;
  set_date: string;
  status: string;
}

const EmbrexDataSheetPage = () => {
  const [data, setData] = useState<EmbrexData[]>([]);
  const [filteredData, setFilteredData] = useState<EmbrexData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'all' | 'selected' | 'compare' | 'timeline'>('all');
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Embrex Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Comprehensive overview of all flock data including clears and injected statistics."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Comprehensive overview of all flock data including clears and injected statistics.";
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    loadEmbrexData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter(
        (item) =>
          item.flock_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.flock_number.toString().includes(searchTerm)
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  const loadEmbrexData = async () => {
    try {
      const { data: batchData, error } = await supabase
        .from("batches")
        .select(`
          id,
          batch_number,
          total_eggs_set,
          eggs_cleared,
          eggs_injected,
          set_date,
          status,
          flocks!inner (
            flock_number,
            flock_name,
            age_weeks
          )
        `)
        .order('set_date', { ascending: false });

      if (error) throw error;

      const formattedData: EmbrexData[] = batchData?.map((batch: any) => ({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        flock_number: batch.flocks.flock_number,
        flock_name: batch.flocks.flock_name,
        age_weeks: batch.flocks.age_weeks,
        total_eggs_set: batch.total_eggs_set,
        eggs_cleared: batch.eggs_cleared,
        eggs_injected: batch.eggs_injected,
        set_date: batch.set_date,
        status: batch.status,
      })) || [];

      setData(formattedData);
      setFilteredData(formattedData);
    } catch (error) {
      console.error("Error loading Embrex data:", error);
      toast({
        title: "Error",
        description: "Failed to load Embrex data sheet",
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

  const validateEmbrexData = (item: EmbrexData) => {
    const totalProcessed = (item.eggs_cleared || 0) + (item.eggs_injected || 0);
    const clearPct = item.eggs_cleared ? (item.eggs_cleared / item.total_eggs_set) * 100 : 0;
    const injectedPct = item.eggs_injected ? (item.eggs_injected / item.total_eggs_set) * 100 : 0;
    
    return {
      isValid: totalProcessed <= item.total_eggs_set && (clearPct + injectedPct) <= 100,
      exceedsTotal: totalProcessed > item.total_eggs_set,
      exceedsPercentage: (clearPct + injectedPct) > 100,
      clearPercentage: clearPct,
      injectedPercentage: injectedPct
    };
  };

  const validationSummary = filteredData.reduce((acc, item) => {
    const validation = validateEmbrexData(item);
    if (!validation.isValid) {
      acc.invalidCount++;
      if (validation.exceedsTotal) acc.exceedsTotalCount++;
      if (validation.exceedsPercentage) acc.exceedsPercentageCount++;
    }
    return acc;
  }, { invalidCount: 0, exceedsTotalCount: 0, exceedsPercentageCount: 0 });

  const comparisonData = selectedHouses.length > 0 ? 
    filteredData.filter(item => selectedHouses.includes(item.batch_id)) : 
    filteredData;

  const generateComparisonChart = () => {
    if (comparisonData.length === 0) return [];
    
    return comparisonData.map(item => ({
      batch: item.batch_number,
      flock: item.flock_name,
      clearPct: item.eggs_cleared ? (item.eggs_cleared / item.total_eggs_set) * 100 : 0,
      injectedPct: item.eggs_injected ? (item.eggs_injected / item.total_eggs_set) * 100 : 0,
      totalEggs: item.total_eggs_set
    }));
  };

  const exportToCSV = () => {
    const headers = [
      "Flock #",
      "Flock Name", 
      "Age (weeks)",
      "Batch #",
      "Set Date",
      "Status",
      "Total Eggs",
      "Clears",
      "Clear %",
      "Injected", 
      "Injected %"
    ];

    const csvData = filteredData.map(item => [
      item.flock_number,
      item.flock_name,
      item.age_weeks,
      item.batch_number,
      new Date(item.set_date).toLocaleDateString(),
      item.status,
      item.total_eggs_set,
      item.eggs_cleared ?? "—",
      calculatePercentage(item.eggs_cleared, item.total_eggs_set),
      item.eggs_injected ?? "—",
      calculatePercentage(item.eggs_injected, item.total_eggs_set)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `embrex-data-sheet-${new Date().toISOString().split('T')[0]}.csv`;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Embrex Data Sheet</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of all flock data including clears and injected statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setComparisonMode('timeline')} 
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Timeline
          </Button>
          <Button onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      {validationSummary.invalidCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Data Validation Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-orange-700">
                <span className="font-medium">{validationSummary.invalidCount}</span> total issues
              </div>
              {validationSummary.exceedsTotalCount > 0 && (
                <div className="text-orange-700">
                  <span className="font-medium">{validationSummary.exceedsTotalCount}</span> exceed total eggs
                </div>
              )}
              {validationSummary.exceedsPercentageCount > 0 && (
                <div className="text-orange-700">
                  <span className="font-medium">{validationSummary.exceedsPercentageCount}</span> exceed 100%
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={comparisonMode} onValueChange={(v) => setComparisonMode(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            All Data
          </TabsTrigger>
          <TabsTrigger value="selected" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Selected Houses
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

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
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Select</TableHead>
                      <TableHead>Flock #</TableHead>
                      <TableHead>Flock Name</TableHead>
                      <TableHead>Age (weeks)</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Set Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Eggs</TableHead>
                      <TableHead className="text-right">Clears</TableHead>
                      <TableHead className="text-right">Clear %</TableHead>
                      <TableHead className="text-right">Injected</TableHead>
                      <TableHead className="text-right">Injected %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => {
                      const validation = validateEmbrexData(item);
                      return (
                        <TableRow key={item.batch_id} className={`hover:bg-muted/50 ${!validation.isValid ? 'bg-red-50' : ''}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedHouses.includes(item.batch_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedHouses([...selectedHouses, item.batch_id]);
                                } else {
                                  setSelectedHouses(selectedHouses.filter(id => id !== item.batch_id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.flock_number}</TableCell>
                          <TableCell>{item.flock_name}</TableCell>
                          <TableCell>{item.age_weeks}</TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell>{new Date(item.set_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                item.status === 'completed' ? 'default' :
                                item.status === 'in_progress' ? 'secondary' :
                                item.status === 'planned' ? 'outline' : 'secondary'
                              }>
                                {item.status.replace('_', ' ')}
                              </Badge>
                              {!validation.isValid && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.total_eggs_set.toLocaleString()}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${validation.exceedsTotal ? 'text-red-600 bg-red-100' : ''}`}>
                            {item.eggs_cleared?.toLocaleString() ?? "—"}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${validation.exceedsPercentage ? 'text-red-600 bg-red-100' : ''}`}>
                            {calculatePercentage(item.eggs_cleared, item.total_eggs_set)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${validation.exceedsTotal ? 'text-red-600 bg-red-100' : ''}`}>
                            {item.eggs_injected?.toLocaleString() ?? "—"}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${validation.exceedsPercentage ? 'text-red-600 bg-red-100' : ''}`}>
                            {calculatePercentage(item.eggs_injected, item.total_eggs_set)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No results found for your search." : "No data available."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selected Houses ({selectedHouses.length} selected)</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedHouses.length === 0 ? "Select houses from the All Data tab to view here." : "Viewing only selected houses."}
              </p>
            </CardHeader>
            <CardContent>
              {selectedHouses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Flock Name</TableHead>
                        <TableHead>Batch #</TableHead>
                        <TableHead className="text-right">Total Eggs</TableHead>
                        <TableHead className="text-right">Clears</TableHead>
                        <TableHead className="text-right">Clear %</TableHead>
                        <TableHead className="text-right">Injected</TableHead>
                        <TableHead className="text-right">Injected %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((item) => (
                        <TableRow key={item.batch_id}>
                          <TableCell className="font-medium">{item.flock_name}</TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell className="text-right font-mono">{item.total_eggs_set.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{item.eggs_cleared?.toLocaleString() ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono">{calculatePercentage(item.eggs_cleared, item.total_eggs_set)}</TableCell>
                          <TableCell className="text-right font-mono">{item.eggs_injected?.toLocaleString() ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono">{calculatePercentage(item.eggs_injected, item.total_eggs_set)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No houses selected. Use the checkboxes in the All Data tab to select houses for comparison.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>House Performance Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedHouses.length === 0 ? "Select houses to compare their clear vs injected rates." : `Comparing ${selectedHouses.length} houses.`}
              </p>
            </CardHeader>
            <CardContent>
              {selectedHouses.length > 0 ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={generateComparisonChart()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="batch" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-medium mb-2">{label}</p>
                                <p className="text-sm text-muted-foreground mb-2">{data.flock}</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>Clear %:</span>
                                    <span className="font-medium">{data.clearPct.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Injected %:</span>
                                    <span className="font-medium">{data.injectedPct.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Total Eggs:</span>
                                    <span>{data.totalEggs.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="clearPct" fill="hsl(348 100% 67%)" name="Clear %" />
                      <Bar dataKey="injectedPct" fill="hsl(142 76% 36%)" name="Injected %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select houses from the All Data tab to see performance comparison charts.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <EmbrexTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmbrexDataSheetPage;