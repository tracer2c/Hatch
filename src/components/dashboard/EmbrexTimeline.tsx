import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { RotateCcw, CalendarIcon, Search, ChevronDown, Filter, Settings, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
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
  const [viewType, setViewType] = useState<'bar' | 'line' | 'area' | 'pie' | 'scatter'>('bar');
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

    const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

    if (viewType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <Bar dataKey="totalEggs" fill="hsl(var(--primary))" name="Total Eggs" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (viewType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <Line 
              type="monotone" 
              dataKey="totalEggs" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              name="Total Eggs"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (viewType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <Area 
              type="monotone" 
              dataKey="totalEggs" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              name="Total Eggs"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (viewType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={timelineData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ period, totalEggs }) => `${period}: ${totalEggs.toLocaleString()}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="totalEggs"
            >
              {timelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium mb-2">{data.period}</p>
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
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (viewType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <Scatter 
              dataKey="totalEggs" 
              fill="hsl(var(--primary))"
              name="Total Eggs"
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return null;
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
        {/* Enhanced Filter Panel */}
        <div className="glass-card bg-gradient-to-br from-background/50 to-muted/30 border-2 border-border/50 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Advanced Filters
              </h3>
              <p className="text-sm text-muted-foreground">Configure your data visualization</p>
            </div>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            </div>
          </div>

          {/* Primary Filters */}
          <div className="space-y-6">
            <div className="bg-card/60 border border-border/60 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm text-foreground/90">Primary Settings</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Flock Selection */}
                <div className="group space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Flock</label>
                  <Select value={selectedFlock} onValueChange={setSelectedFlock}>
                    <SelectTrigger className="h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-md border-border/60">
                      <SelectItem value="all" className="hover:bg-accent/60">All flocks</SelectItem>
                      {flockOptions.map((flock) => (
                        <SelectItem key={flock.id} value={flock.id} className="hover:bg-accent/60">
                          #{flock.number} — {flock.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Metric Selection */}
                <div className="group space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Metric</label>
                  <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger className="h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-md border-border/60">
                      <SelectItem value="total_eggs" className="hover:bg-accent/60">Total Eggs</SelectItem>
                      <SelectItem value="eggs_cleared" className="hover:bg-accent/60">Eggs Cleared</SelectItem>
                      <SelectItem value="eggs_injected" className="hover:bg-accent/60">Eggs Injected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Scale */}
                <div className="group space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Time Scale</label>
                  <Select value={timeScale} onValueChange={setTimeScale}>
                    <SelectTrigger className="h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-md border-border/60">
                      <SelectItem value="days" className="hover:bg-accent/60">Days</SelectItem>
                      <SelectItem value="weeks" className="hover:bg-accent/60">Weeks</SelectItem>
                      <SelectItem value="months" className="hover:bg-accent/60">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Type */}
                <div className="group space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Visualization</label>
                  <Select value={viewType} onValueChange={(value) => setViewType(value as 'bar' | 'line' | 'area' | 'pie' | 'scatter')}>
                    <SelectTrigger className="h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-md border-border/60">
                      <SelectItem value="bar" className="hover:bg-accent/60 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Bar Chart
                      </SelectItem>
                      <SelectItem value="line" className="hover:bg-accent/60">Line Chart</SelectItem>
                      <SelectItem value="area" className="hover:bg-accent/60">Area Chart</SelectItem>
                      <SelectItem value="pie" className="hover:bg-accent/60">Pie Chart</SelectItem>
                      <SelectItem value="scatter" className="hover:bg-accent/60">Scatter Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="bg-card/60 border border-border/60 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm text-foreground/90">Date Range</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "MM/dd/yyyy") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-md border-border/60" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                        className="rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "MM/dd/yyyy") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-md border-border/60" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                        className="rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Advanced Comparison */}
            <div className="bg-card/60 border border-border/60 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm text-foreground/90">Advanced Comparison</h4>
                <div className="ml-auto">
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                    {compareFlocks.length}/4 selected
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Compare Flocks</label>
                  <Popover open={showFlockDropdown} onOpenChange={setShowFlockDropdown}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-10 bg-background/80 border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
                        <span className="text-muted-foreground">Select flocks to compare</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-card/95 backdrop-blur-md border-border/60" align="start">
                      <div className="p-3 border-b border-border/60">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search flocks..."
                            value={flockSearch}
                            onChange={(e) => setFlockSearch(e.target.value)}
                            className="pl-9 bg-background/60 border-border/60"
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-auto">
                        {filteredFlockOptions.map((flock) => (
                          <div
                            key={flock.id}
                            className="flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-accent/60 transition-colors duration-150"
                            onClick={() => toggleFlockComparison(flock.id)}
                          >
                            <input
                              type="checkbox"
                              checked={compareFlocks.includes(flock.id)}
                              onChange={() => toggleFlockComparison(flock.id)}
                              className="rounded border-border/60"
                            />
                            <span className="text-sm">#{flock.number} — {flock.name}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Selected Flocks Display */}
                {compareFlocks.length > 0 && (
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-2">
                      {compareFlocks.map((flockId) => {
                        const flock = flockOptions.find(f => f.id === flockId);
                        return flock ? (
                          <Badge 
                            key={flockId} 
                            variant="secondary" 
                            className="gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-200 animate-fade-in"
                          >
                            #{flock.number} — {flock.name}
                            <button
                              onClick={() => toggleFlockComparison(flockId)}
                              className="ml-1 text-xs hover:text-destructive transition-colors duration-150"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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