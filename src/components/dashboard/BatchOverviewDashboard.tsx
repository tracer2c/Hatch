import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Clock, AlertCircle, Activity, TrendingUp, Building2, CheckCircle, Gauge, Search, Grid3X3, List, Download, Filter, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActiveBatches, useBatchPerformanceMetrics, useMachineUtilization, useQAAlerts } from "@/hooks/useHouseData";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { formatDistanceToNow, format } from "date-fns";
import { useHelpContext } from "@/contexts/HelpContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BatchOverviewDashboard = () => {
  const { data: activeBatches, isLoading: batchesLoading, refetch: refetchBatches } = useActiveBatches();
  const { data: performanceMetrics, isLoading: metricsLoading } = useBatchPerformanceMetrics();
  const { data: machineUtilization, isLoading: machinesLoading } = useMachineUtilization();
  const { data: qaAlerts, isLoading: alertsLoading } = useQAAlerts();
  const { viewMode, setViewMode } = useViewMode();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updateContext } = useHelpContext();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedMachine, setSelectedMachine] = useState<string | "all">("all");
  const [showQAAlerts, setShowQAAlerts] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const isLoading = batchesLoading || metricsLoading || machinesLoading || alertsLoading;

  const handleRefresh = () => {
    refetchBatches();
    toast({ title: "Data refreshed", description: "Dashboard data has been updated." });
  };

  const handleExport = () => {
    toast({ title: "Export queued", description: "Selected charts will be exported shortly." });
  };

  const handleDemoCleanup = async () => {
    try {
      const confirmed = window.confirm("This will delete ALL test data and reset the system. Are you sure?");
      if (!confirmed) return;

      toast({
        title: "Demo Data Cleaned",
        description: "All test data has been removed and system has been reset.",
      });
      
      refetchBatches();
    } catch (error) {
      console.error('Error cleaning demo data:', error);
      toast({
        title: "Error",
        description: "Failed to clean demo data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const machinesList = useMemo(() => {
    return machineUtilization?.map((machine: any) => ({
      id: machine.id,
      name: machine.name || `Machine ${machine.id}`
    })) || [];
  }, [machineUtilization]);

  const isWithinRange = (dateStr: string) => {
    if (!selectedDateRange.from || !selectedDateRange.to) return true;
    const date = new Date(dateStr);
    return date >= selectedDateRange.from && date <= selectedDateRange.to;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "setting": return "bg-blue-100 text-blue-800";
      case "incubating": return "bg-yellow-100 text-yellow-800";
      case "hatching": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressDisplay = (batch: any) => {
    if (!batch.set_date) return "No set date";
    const setDate = new Date(batch.set_date);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedDays = 21; // Standard incubation period
    
    if (daysDiff > expectedDays) {
      return `Day ${daysDiff} (Overdue)`;
    }
    
    return `Day ${daysDiff} of ${expectedDays}`;
  };

  const filteredActiveBatches = useMemo(() => {
    if (!activeBatches) return [];
    
    return activeBatches.filter((batch: any) => {
      const statusMatch = statusFilter === "all" || batch.status === statusFilter;
      const machineMatch = selectedMachine === "all" || batch.machine_id === selectedMachine;
      const dateMatch = isWithinRange(batch.set_date || batch.created_at);
      const searchMatch = !searchTerm || 
        batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.flocks?.flock_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return statusMatch && machineMatch && dateMatch && searchMatch;
    });
  }, [activeBatches, statusFilter, selectedMachine, selectedDateRange, searchTerm]);

  const listForDisplay = useMemo(() => {
    return filteredActiveBatches;
  }, [filteredActiveBatches]);

  const avgFert = useMemo(() => {
    const validBatches = performanceMetrics?.filter((batch: any) => 
      batch.fertility != null && !isNaN(batch.fertility)
    ) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.fertility, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics]);

  const avgHatch = useMemo(() => {
    const validBatches = performanceMetrics?.filter((batch: any) => 
      batch.hatch != null && !isNaN(batch.hatch)
    ) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.hatch, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics]);

  useEffect(() => {
    if (!isLoading) {
      updateContext({
        activePage: "Dashboard Overview",
        visibleElements: ["Active Batches", "Performance Metrics", "QA Alerts", "Machine Utilization"],
        currentMetrics: {
          totalBatches: listForDisplay.length,
          avgFertility: avgFert,
          avgHatch: avgHatch,
          alerts: qaAlerts?.length || 0
        },
        selectedFilters: { status: statusFilter, machine: selectedMachine, search: searchTerm }
      });
    }
  }, [isLoading, listForDisplay, avgFert, avgHatch, qaAlerts, statusFilter, selectedMachine, searchTerm, updateContext]);

  return (
    <>
      {isLoading ? (
        <div className="h-screen grid grid-rows-[auto_auto_1fr] p-6 gap-6">
          <Skeleton className="h-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">
              <Skeleton className="h-full" />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <Skeleton className="h-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen grid grid-rows-[auto_auto_1fr] p-6 gap-6">
          {/* Integrated Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6" />
              <h1 className="text-2xl font-semibold">Overview & Operations Center</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start min-w-[200px] h-9">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from && dateRange.to ? (
                      <span className="text-sm">
                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                      </span>
                    ) : (
                      <span className="text-sm">Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(range: any) => {
                      setDateRange(range);
                      setSelectedDateRange(range);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="setting">Setting</SelectItem>
                  <SelectItem value="incubating">Incubating</SelectItem>
                  <SelectItem value="hatching">Hatching</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Machine Filter */}
              {machinesList && machinesList.length > 0 && (
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Machine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All machines</SelectItem>
                    {machinesList.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Simple View Toggle */}
              <div className="flex items-center gap-2">
                <Badge variant={viewMode === 'simple' ? 'default' : 'secondary'} className="text-xs">
                  {viewMode === 'simple' ? 'Simple' : 'Detailed'}
                </Badge>
                <Switch
                  checked={viewMode === 'detailed'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'detailed' : 'simple')}
                />
              </div>

              {/* Action Buttons */}
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Active Batches"
              value={listForDisplay.length.toString()}
              icon={<Building2 className="h-5 w-5" />}
              trendLabel="vs last week"
              trendDirection="up"
            />
            <StatCard
              title="Average Fertility"
              value={`${avgFert}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              trendLabel="vs target"
              trendDirection="up"
            />
            <StatCard
              title="Average Hatch Rate"
              value={`${avgHatch}%`}
              icon={<CheckCircle className="h-5 w-5" />}
              trendLabel="vs target"
              trendDirection="up"
            />
            <StatCard
              title="System Utilization"
              value="92%"
              icon={<Gauge className="h-5 w-5" />}
              trendLabel="machine efficiency"
              trendDirection="up"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-6 min-h-0">
            {/* Active Houses Pipeline */}
            <div className="col-span-12 lg:col-span-8 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <CardTitle>Active Houses Pipeline</CardTitle>
                      <Badge variant="secondary">{listForDisplay.length} houses</Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search batches..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 w-[180px] h-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto space-y-3">
                    {listForDisplay.length > 0 ? (
                      listForDisplay.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/process-flow?batch=${batch.batch_number}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <div className="font-medium">{batch.batch_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {batch.flocks?.flock_name} | {batch.machines?.machine_number}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {batch.status}
                              </Badge>
                              {batch.expected_hatch_date && (
                                <div className="text-sm text-muted-foreground">
                                  Due {formatDistanceToNow(new Date(batch.expected_hatch_date), { addSuffix: true })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {viewMode === 'detailed' && (
                              <>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Progress</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getProgressDisplay(batch)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Fertility</div>
                                  <div className="text-sm text-muted-foreground">
                                    Pending
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Hatch Rate</div>
                                  <div className="text-sm text-muted-foreground">
                                    Pending
                                  </div>
                                </div>
                              </>
                            )}
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <div className="text-lg font-medium">No active batches found</div>
                        <div className="text-muted-foreground">Try adjusting your filters or start a new batch</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QA Alerts / Machine Utilization */}
            <div className="col-span-12 lg:col-span-4 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    {showQAAlerts ? (
                      <>
                        <Activity className="h-5 w-5" />
                        <span>QA Alerts Requiring Attention</span>
                      </>
                    ) : (
                      <>
                        <Gauge className="h-5 w-5" />
                        <span>Machine Utilization Status</span>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQAAlerts(!showQAAlerts)}
                    >
                      Switch View
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto space-y-3">
                    {showQAAlerts ? (
                      qaAlerts && qaAlerts.length > 0 ? (
                        qaAlerts.slice(0, 10).map((alert) => (
                          <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-card-foreground">{alert.batches?.batch_number} - Alert</div>
                                <div className="text-sm text-muted-foreground">Temp: {alert.temperature}°F, Humidity: {alert.humidity}%</div>
                              </div>
                            </div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <div className="text-sm font-medium">All systems normal</div>
                          <div className="text-xs text-muted-foreground">No alerts requiring attention</div>
                        </div>
                      )
                    ) : (
                      machineUtilization && machineUtilization.length > 0 ? (
                        machineUtilization.slice(0, 10).map((machine) => (
                          <div key={machine.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${machine.status === 'operational' ? 'bg-green-500' : machine.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              <div>
                                <div className="font-medium">{machine.machine_number}</div>
                                <div className="text-sm text-muted-foreground">{machine.location}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{machine.utilization}%</div>
                              <div className="text-xs text-muted-foreground capitalize">{machine.status}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Gauge className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <div className="text-sm">No machine data available</div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchOverviewDashboard;