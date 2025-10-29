import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line } from 'recharts';
import { Button } from "@/components/ui/button";
import { Check, Activity, TrendingUp, BarChart3, Calendar, Building2, Home } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { format } from "date-fns";
import { useEffect } from "react";
import { useHelpContext } from '@/contexts/HelpContext';

interface ComparisonAnalysisProps {
  data: any[];
}


const formatFlockLabel = (item: any) => {
  const name = item.flockName || 'Unknown';
  const numPart = item.flockNumber !== undefined && item.flockNumber !== null ? ` #${item.flockNumber}` : '';
  const farmPart = item.houseNumber !== undefined && item.houseNumber !== null ? ` (${item.houseNumber})` : ' (N/A)';
  return `${name}${numPart}${farmPart}`;
};

const ComparisonAnalysis = ({ data }: ComparisonAnalysisProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("flocks");
  const { updateContext } = useHelpContext();

  const handleItemSelect = (batchNumber: string) => {
    if (selectedItems.includes(batchNumber)) {
      setSelectedItems(selectedItems.filter(item => item !== batchNumber));
    } else if (selectedItems.length < 5) {
      setSelectedItems([...selectedItems, batchNumber]);
    }
  };

  // Filter data for comparison - only show batches with some meaningful data
  const displayData = useMemo(() => 
    data.filter(batch => 
      batch.hasEggQuality || batch.hasFertilityData || batch.hasQAData
    ), [data]);

  const selectedData = useMemo(() => 
    displayData.filter(item => selectedItems.includes(item.batchNumber)),
    [displayData, selectedItems]);

  // House comparison data
  const houseComparison = useMemo(() => {
    const houseData = data
      .filter(batch => batch.hasFertilityData && batch.fertility !== null && batch.houseNumber !== 'N/A')
      .reduce((acc, item) => {
        if (!acc[item.houseNumber]) {
          acc[item.houseNumber] = {
            house: item.houseNumber,
            unitName: item.unitName,
            fertility: [],
            hatch: [],
            qualityScore: [],
            hof: [],
            totalBatches: 0
          };
        }
        acc[item.houseNumber].fertility.push(item.fertility);
        acc[item.houseNumber].hatch.push(item.hatch || 0);
        acc[item.houseNumber].qualityScore.push(item.qualityScore || 0);
        acc[item.houseNumber].hof.push(item.hof || 0);
        acc[item.houseNumber].totalBatches++;
        return acc;
      }, {} as any);

    return Object.keys(houseData).map(house => {
      const stats = houseData[house];
      return {
        house,
        unitName: stats.unitName,
        avgFertility: stats.fertility.reduce((a: number, b: number) => a + b, 0) / stats.fertility.length,
        avgHatch: stats.hatch.reduce((a: number, b: number) => a + b, 0) / stats.hatch.length,
        avgQualityScore: stats.qualityScore.reduce((a: number, b: number) => a + b, 0) / stats.qualityScore.length,
        avgHOF: stats.hof.reduce((a: number, b: number) => a + b, 0) / stats.hof.length,
        totalBatches: stats.totalBatches
      };
    }).sort((a, b) => a.house.localeCompare(b.house));
  }, [data]);

  // Unit comparison data
  const unitComparison = useMemo(() => {
    const unitData = data
      .filter(batch => batch.hasFertilityData && batch.fertility !== null)
      .reduce((acc, item) => {
        if (!acc[item.unitName]) {
          acc[item.unitName] = {
            unit: item.unitName,
            location: item.unitLocation,
            fertility: [],
            hatch: [],
            qualityScore: [],
            hof: [],
            totalBatches: 0
          };
        }
        acc[item.unitName].fertility.push(item.fertility);
        acc[item.unitName].hatch.push(item.hatch || 0);
        acc[item.unitName].qualityScore.push(item.qualityScore || 0);
        acc[item.unitName].hof.push(item.hof || 0);
        acc[item.unitName].totalBatches++;
        return acc;
      }, {} as any);

    return Object.keys(unitData).map(unit => {
      const stats = unitData[unit];
      return {
        unit,
        location: stats.location,
        avgFertility: stats.fertility.reduce((a: number, b: number) => a + b, 0) / stats.fertility.length,
        avgHatch: stats.hatch.reduce((a: number, b: number) => a + b, 0) / stats.hatch.length,
        avgQualityScore: stats.qualityScore.reduce((a: number, b: number) => a + b, 0) / stats.qualityScore.length,
        avgHOF: stats.hof.reduce((a: number, b: number) => a + b, 0) / stats.hof.length,
        totalBatches: stats.totalBatches
      };
    });
  }, [data]);

  // Breed comparison data - only include batches with fertility data for breed comparison
  const breedComparison = useMemo(() => {
    const breedData = data
      .filter(batch => batch.hasFertilityData && batch.fertility !== null)
      .reduce((acc, item) => {
        if (!acc[item.breed]) {
          acc[item.breed] = {
            breed: item.breed,
            fertility: [],
            hatch: [],
            qualityScore: [],
            hof: [],
            earlyDead: []
          };
        }
        acc[item.breed].fertility.push(item.fertility);
        acc[item.breed].hatch.push(item.hatch || 0);
        acc[item.breed].qualityScore.push(item.qualityScore || 0);
        acc[item.breed].hof.push(item.hof || 0);
        acc[item.breed].earlyDead.push(item.earlyDeadPercent || 0);
        return acc;
      }, {} as any);

    return Object.keys(breedData).map(breed => {
      const stats = breedData[breed];
      return {
        breed,
        avgFertility: stats.fertility.reduce((a: number, b: number) => a + b, 0) / stats.fertility.length,
        avgHatch: stats.hatch.reduce((a: number, b: number) => a + b, 0) / stats.hatch.length,
        avgQualityScore: stats.qualityScore.reduce((a: number, b: number) => a + b, 0) / stats.qualityScore.length,
        avgHOF: stats.hof.reduce((a: number, b: number) => a + b, 0) / stats.hof.length,
        avgEarlyDead: stats.earlyDead.reduce((a: number, b: number) => a + b, 0) / stats.earlyDead.length,
        count: stats.fertility.length
      };
    });
  }, [data]);

  // Time-based comparison (monthly performance)
  const timeComparison = useMemo(() => {
    const monthlyData = data
      .filter(batch => batch.hasFertilityData && batch.fertility !== null && batch.setDate)
      .reduce((acc, item) => {
        const month = format(new Date(item.setDate), 'yyyy-MM');
        if (!acc[month]) {
          acc[month] = {
            month,
            fertility: [],
            hatch: [],
            qualityScore: [],
            count: 0
          };
        }
        acc[month].fertility.push(item.fertility);
        acc[month].hatch.push(item.hatch || 0);
        acc[month].qualityScore.push(item.qualityScore || 0);
        acc[month].count++;
        return acc;
      }, {} as any);

    return Object.keys(monthlyData)
      .map(month => {
        const stats = monthlyData[month];
        return {
          month: format(new Date(month + '-01'), 'MMM yyyy'),
          avgFertility: stats.fertility.reduce((a: number, b: number) => a + b, 0) / stats.fertility.length,
          avgHatch: stats.hatch.reduce((a: number, b: number) => a + b, 0) / stats.hatch.length,
          avgQualityScore: stats.qualityScore.reduce((a: number, b: number) => a + b, 0) / stats.qualityScore.length,
          batchCount: stats.count
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [data]);

  // Update help context when tab or selection changes
  useEffect(() => {
    const visibleElements = [];
    const currentMetrics: Record<string, any> = {};
    
    if (activeTab === "flocks") {
      visibleElements.push("Flock Selection", "Flock Comparison Chart");
      currentMetrics.selectedFlocks = selectedItems.length;
      currentMetrics.maxSelectionReached = selectedItems.length >= 5;
    } else if (activeTab === "houses") {
      visibleElements.push("House Performance Chart", "House Statistics");
      currentMetrics.totalHouses = houseComparison.length;
    } else if (activeTab === "units") {
      visibleElements.push("Unit Performance Chart", "Unit Statistics");
      currentMetrics.totalUnits = unitComparison.length;
    } else if (activeTab === "breeds") {
      visibleElements.push("Breed Performance Chart", "Breed Statistics");
      currentMetrics.totalBreeds = breedComparison.length;
    } else if (activeTab === "trends") {
      visibleElements.push("Monthly Trends Chart", "Performance Timeline");
      currentMetrics.timeRange = "Last 12 months";
    }

    updateContext({
      activePage: "Comparison Model",
      activeTab: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
      visibleElements,
      currentMetrics,
      selectedFilters: {
        dataAvailable: data.length,
        hasQualityData: data.some(d => d.qualityScore !== null),
        hasFertilityData: data.some(d => d.fertility !== null)
      }
    });
  }, [activeTab, selectedItems, data, houseComparison, unitComparison, breedComparison, updateContext]);

  // Prepare radar chart data for selected items
  const radarData = selectedData.map(item => ({
    name: formatFlockLabel(item),
    fertility: item.fertility || 0,
    hatch: item.hatch || 0,
    qualityScore: item.qualityScore || 0,
    hof: item.hof || 0,
    earlyDead: item.earlyDead ? 10 - item.earlyDead : 10 // Invert early dead for better visualization
  }));

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="flocks" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Flocks
          </TabsTrigger>
          <TabsTrigger value="houses" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Houses
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Hatcheries
          </TabsTrigger>
          <TabsTrigger value="breeds" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Breeds
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flocks" className="space-y-6">
          {/* Flock Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Select Flocks to Compare
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose up to 5 flocks for detailed performance comparison.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Items Display */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Selected for Comparison:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItems.map(batchNumber => {
                      const item = data.find(d => d.batchNumber === batchNumber);
                      return (
                        <Badge 
                          key={batchNumber} 
                          variant="default" 
                          className="cursor-pointer px-3 py-1 text-sm hover:bg-primary/80"
                          onClick={() => handleItemSelect(batchNumber)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {formatFlockLabel(item)}
                          <span className="ml-2 text-xs">×</span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Batch Selection Grid */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Available Flocks ({displayData.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                  {displayData.map(item => {
                    const isSelected = selectedItems.includes(item.batchNumber);
                    const isDisabled = !isSelected && selectedItems.length >= 5;
                    
                    return (
                      <Card
                        key={item.batchNumber}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : isDisabled 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:bg-muted/50'
                        }`}
                        onClick={() => !isDisabled && handleItemSelect(item.batchNumber)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">{formatFlockLabel(item)}</div>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Unit:</span>
                              <span className="text-xs font-medium">{item.unitName}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Fertility:</span>
                              <span className="text-xs font-medium">
                                {item.fertility ? `${item.fertility.toFixed(1)}%` : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              {selectedItems.length >= 5 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  Maximum of 5 flocks selected. Remove some to select others.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Items Comparison */}
          {selectedData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Selected Flocks Detailed Comparison</CardTitle>
                  <ChartDownloadButton chartId="flock-comparison" filename="flock-comparison" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">Performance Overview</h3>
                    <div id="flock-comparison" className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={selectedData.map(item => ({
                          name: `${item.flockName} #${item.flockNumber}`,
                          fertility: item.fertility || 0,
                          hatch: item.hatch || 0,
                          qualityScore: item.qualityScore || 0,
                        }))}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar name="Fertility" dataKey="fertility" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.25} />
                          <Radar name="Hatch Rate" dataKey="hatch" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.25} />
                          <Radar name="Quality Score" dataKey="qualityScore" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.25} />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Comparison Table */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">Detailed Metrics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Flock</th>
                            <th className="text-center p-2 text-xs font-medium text-muted-foreground">Fertility</th>
                            <th className="text-center p-2 text-xs font-medium text-muted-foreground">Hatch</th>
                            <th className="text-center p-2 text-xs font-medium text-muted-foreground">Quality</th>
                            <th className="text-center p-2 text-xs font-medium text-muted-foreground">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedData.map(item => (
                            <tr key={item.batchNumber} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                <div className="font-medium text-xs">{formatFlockLabel(item)}</div>
                              </td>
                              <td className="p-2 text-center text-xs">
                                {item.fertility ? `${item.fertility.toFixed(1)}%` : 'Pending'}
                              </td>
                              <td className="p-2 text-center text-xs">
                                {item.hatch ? `${item.hatch.toFixed(1)}%` : 'Pending'}
                              </td>
                              <td className="p-2 text-center text-xs">
                                {item.qualityScore ? `${item.qualityScore.toFixed(1)}%` : 'Pending'}
                              </td>
                              <td className="p-2 text-center text-xs">{item.unitName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="houses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  House Performance Comparison
                </CardTitle>
                <ChartDownloadButton chartId="house-comparison" filename="house-comparison" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="house-comparison" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={houseComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="house" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`]} />
                      <Bar dataKey="avgFertility" fill="hsl(var(--chart-1))" name="Fertility" radius={[2,2,0,0]} />
                      <Bar dataKey="avgHatch" fill="hsl(var(--chart-2))" name="Hatch Rate" radius={[2,2,0,0]} />
                      <Bar dataKey="avgQualityScore" fill="hsl(var(--chart-3))" name="Quality Score" radius={[2,2,0,0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold">House Statistics</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {houseComparison.map(stat => (
                      <div key={stat.house} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{stat.house}</h4>
                          <Badge variant="outline">{stat.unitName}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Fertility: <span className="font-medium">{stat.avgFertility.toFixed(1)}%</span></div>
                          <div>Hatch: <span className="font-medium">{stat.avgHatch.toFixed(1)}%</span></div>
                          <div>Quality: <span className="font-medium">{stat.avgQualityScore.toFixed(1)}%</span></div>
                          <div>Batches: <span className="font-medium">{stat.totalBatches}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Hatchery Performance Comparison
                </CardTitle>
                <ChartDownloadButton chartId="unit-comparison" filename="unit-comparison" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="unit-comparison" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={unitComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="unit" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`]} />
                      <Bar dataKey="avgFertility" fill="hsl(var(--chart-1))" name="Fertility" radius={[4,4,0,0]} />
                      <Bar dataKey="avgHatch" fill="hsl(var(--chart-2))" name="Hatch Rate" radius={[4,4,0,0]} />
                      <Bar dataKey="avgQualityScore" fill="hsl(var(--chart-3))" name="Quality Score" radius={[4,4,0,0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Hatchery Statistics</h3>
                  <div className="space-y-3">
                    {unitComparison.map(stat => (
                      <div key={stat.unit} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-lg">{stat.unit}</h4>
                          <Badge>{stat.totalBatches} batches</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{stat.location}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Fertility: <span className="font-medium">{stat.avgFertility.toFixed(1)}%</span></div>
                          <div>Hatch: <span className="font-medium">{stat.avgHatch.toFixed(1)}%</span></div>
                          <div>Quality: <span className="font-medium">{stat.avgQualityScore.toFixed(1)}%</span></div>
                          <div>HOF: <span className="font-medium">{stat.avgHOF.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breeds" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Breed Performance Comparison
                </CardTitle>
                <ChartDownloadButton chartId="breed-comparison" filename="breed-comparison" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="breed-comparison" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breedComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="breed" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`]} />
                      <Bar dataKey="avgFertility" fill="hsl(var(--chart-1))" name="Fertility" radius={[2,2,0,0]} />
                      <Bar dataKey="avgHatch" fill="hsl(var(--chart-2))" name="Hatch Rate" radius={[2,2,0,0]} />
                      <Bar dataKey="avgQualityScore" fill="hsl(var(--chart-3))" name="Quality Score" radius={[2,2,0,0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Breed Statistics</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {breedComparison.map(stat => (
                      <div key={stat.breed} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{stat.breed}</h4>
                          <Badge>{stat.count} flocks</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Fertility: <span className="font-medium">{stat.avgFertility.toFixed(1)}%</span></div>
                          <div>Hatch: <span className="font-medium">{stat.avgHatch.toFixed(1)}%</span></div>
                          <div>Quality: <span className="font-medium">{stat.avgQualityScore.toFixed(1)}%</span></div>
                          <div>Early Dead: <span className="font-medium">{stat.avgEarlyDead.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Performance Trends Over Time
                </CardTitle>
                <ChartDownloadButton chartId="trend-comparison" filename="trend-comparison" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80" id="trend-comparison">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`${(value as number).toFixed(1)}%`, name]} />
                    <Line type="monotone" dataKey="avgFertility" stroke="hsl(var(--chart-1))" name="Fertility" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgHatch" stroke="hsl(var(--chart-2))" name="Hatch Rate" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgQualityScore" stroke="hsl(var(--chart-3))" name="Quality Score" strokeWidth={2} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComparisonAnalysis;
