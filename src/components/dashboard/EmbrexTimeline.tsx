import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { RotateCcw, CalendarIcon, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface TimelineData {
  period: string;
  totalEggs: number;
  flockName: string;
  batchNumber: string;
  setDate: string;
}

interface FlockOption {
  id: string;
  name: string;
  number: number;
}

interface EmbrexTimelineProps {
  className?: string;
}

export const EmbrexTimeline = ({ className }: EmbrexTimelineProps) => {
  const [viewType, setViewType] = useState<'bar' | 'line'>('bar');
  const [selectedFlock, setSelectedFlock] = useState<string>('all');
  const [metric, setMetric] = useState<string>('total_eggs');
  const [timeScale, setTimeScale] = useState<string>('months');
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [compareFlocks, setCompareFlocks] = useState<string[]>([]);
  const [flockSearch, setFlockSearch] = useState("");
  const [showFlockDropdown, setShowFlockDropdown] = useState(false);
  
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [flockOptions, setFlockOptions] = useState<FlockOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    loadFlockOptions();
    loadTimelineData();
  }, []);

  useEffect(() => {
    loadTimelineData();
  }, [selectedFlock, metric, timeScale, fromDate, toDate, compareFlocks]);

  const loadFlockOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('flocks')
        .select('id, flock_name, flock_number')
        .order('flock_number');

      if (error) throw error;

      const options: FlockOption[] = data?.map((flock: any) => ({
        id: flock.id,
        name: flock.flock_name,
        number: flock.flock_number,
      })) || [];

      setFlockOptions(options);
    } catch (error) {
      console.error('Error loading flock options:', error);
    }
  };

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          total_eggs_set,
          eggs_cleared,
          eggs_injected,
          set_date,
          flocks!inner (
            id,
            flock_name,
            flock_number
          )
        `)
        .order('set_date', { ascending: true });

      // Apply flock filter
      if (selectedFlock !== 'all') {
        query = query.eq('flocks.id', selectedFlock);
      }

      // Apply date range filter
      if (fromDate) {
        query = query.gte('set_date', fromDate.toISOString().split('T')[0]);
      }
      if (toDate) {
        query = query.lte('set_date', toDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data for timeline
      const processedData: TimelineData[] = data?.map((batch: any) => {
        const date = new Date(batch.set_date);
        let period = '';
        
        switch (timeScale) {
          case 'months':
            period = format(date, 'yyyy-MM');
            break;
          case 'weeks':
            period = format(date, 'yyyy-\'W\'ww');
            break;
          case 'days':
            period = format(date, 'yyyy-MM-dd');
            break;
          default:
            period = format(date, 'yyyy-MM');
        }

        return {
          period,
          totalEggs: batch.total_eggs_set || 0,
          flockName: batch.flocks.flock_name,
          batchNumber: batch.batch_number,
          setDate: batch.set_date,
        };
      }) || [];

      // Aggregate by time period
      const aggregatedData = processedData.reduce((acc: Record<string, TimelineData>, curr) => {
        if (!acc[curr.period]) {
          acc[curr.period] = {
            period: curr.period,
            totalEggs: 0,
            flockName: curr.flockName,
            batchNumber: curr.batchNumber,
            setDate: curr.setDate,
          };
        }
        acc[curr.period].totalEggs += curr.totalEggs;
        return acc;
      }, {});

      const finalData = Object.values(aggregatedData).sort((a, b) => 
        a.period.localeCompare(b.period)
      );

      setTimelineData(finalData);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      toast({
        title: "Error",
        description: "Failed to load timeline data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFlock('all');
    setMetric('total_eggs');
    setTimeScale('months');
    setFromDate(undefined);
    setToDate(undefined);
    setCompareFlocks([]);
    setFlockSearch("");
  };

  const filteredFlockOptions = flockOptions.filter(flock =>
    flock.name.toLowerCase().includes(flockSearch.toLowerCase()) ||
    flock.number.toString().includes(flockSearch)
  );

  const toggleFlockComparison = (flockId: string) => {
    if (compareFlocks.includes(flockId)) {
      setCompareFlocks(compareFlocks.filter(id => id !== flockId));
    } else if (compareFlocks.length < 4) {
      setCompareFlocks([...compareFlocks, flockId]);
    }
  };

  const renderChart = () => {
    if (loading) {
      return <div className="h-64 flex items-center justify-center">Loading...</div>;
    }

    if (timelineData.length === 0) {
      return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>;
    }

    const ChartComponent = viewType === 'bar' ? BarChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="period" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={11}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-2">{label}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Total Eggs:</span>
                        <span className="font-medium">{data.totalEggs.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {viewType === 'bar' ? (
            <Bar dataKey="totalEggs" fill="hsl(var(--primary))" name="Total Eggs" />
          ) : (
            <Line 
              type="monotone" 
              dataKey="totalEggs" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              name="Total Eggs"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className={className} id="embrex-timeline-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Embrex Timeline</CardTitle>
            <p className="text-sm text-muted-foreground">
              Displays Total Eggs over time by flock and time scale
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <ChartDownloadButton chartId="embrex-timeline-chart" filename="embrex-timeline" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="space-y-4">
          <h3 className="font-semibold">Controls</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Flock Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Flock</label>
              <Select value={selectedFlock} onValueChange={setSelectedFlock}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All flocks</SelectItem>
                  {flockOptions.map((flock) => (
                    <SelectItem key={flock.id} value={flock.id}>
                      #{flock.number} — {flock.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metric Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Metric</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_eggs">Total Eggs</SelectItem>
                  <SelectItem value="eggs_cleared">Eggs Cleared</SelectItem>
                  <SelectItem value="eggs_injected">Eggs Injected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Scale */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Time scale</label>
              <Select value={timeScale} onValueChange={setTimeScale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">View</label>
              <div className="flex rounded-md bg-muted p-1">
                <Button
                  variant={viewType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('bar')}
                  className="flex-1"
                >
                  Bar
                </Button>
                <Button
                  variant={viewType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('line')}
                  className="flex-1"
                >
                  Line
                </Button>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Compare Flocks */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Compare flocks (up to 4)</label>
            <Popover open={showFlockDropdown} onOpenChange={setShowFlockDropdown}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="text-muted-foreground">Select flocks to compare</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search flocks..."
                      value={flockSearch}
                      onChange={(e) => setFlockSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-auto">
                  {filteredFlockOptions.map((flock) => (
                    <div
                      key={flock.id}
                      className="flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-accent"
                      onClick={() => toggleFlockComparison(flock.id)}
                    >
                      <input
                        type="checkbox"
                        checked={compareFlocks.includes(flock.id)}
                        onChange={() => toggleFlockComparison(flock.id)}
                        className="rounded"
                      />
                      <span className="text-sm">#{flock.number} — {flock.name}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t text-xs text-muted-foreground">
                  {compareFlocks.length}/4 selected
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Flocks */}
          {compareFlocks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {compareFlocks.map((flockId) => {
                const flock = flockOptions.find(f => f.id === flockId);
                return flock ? (
                  <Badge key={flockId} variant="secondary" className="gap-1">
                    #{flock.number} — {flock.name}
                    <button
                      onClick={() => toggleFlockComparison(flockId)}
                      className="ml-1 text-xs hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Timeline Chart */}
        <div className="space-y-2">
          <h3 className="font-semibold">Timeline ({timelineData.length} points)</h3>
          <div className="border rounded-lg p-4">
            {renderChart()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};