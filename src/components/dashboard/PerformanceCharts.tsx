import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import DemoTutorial from "./DemoTutorial";
import { AITooltip } from "@/components/ui/ai-tooltip";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";

interface PerformanceChartsProps {
  data: any[];
}

const performanceDemoSteps = [
  {
    id: "chart-controls",
    title: "Chart Controls",
    description: "Use these controls to customize your view. Sort data by different metrics and switch between chart types for better insights.",
    target: "chart-controls",
    position: "bottom" as const
  },
  {
    id: "main-chart",
    title: "Detailed Performance Analysis",
    description: "This main chart displays all performance metrics for each flock. You can switch between bar and area charts to visualize data differently.",
    target: "main-chart",
    position: "top" as const
  },
  {
    id: "correlation-chart",
    title: "Correlation Analysis",
    description: "This scatter plot helps identify relationships between flock age and fertility performance, revealing important patterns.",
    target: "correlation-chart",
    position: "top" as const
  },
  {
    id: "top-performers",
    title: "Top Performers",
    description: "These cards highlight your best performing flocks based on fertility rates, helping you identify successful operations.",
    target: "top-performers",
    position: "top" as const
  },
  {
    id: "bottom-performers",
    title: "Bottom Performers",
    description: "These cards show flocks that need attention, allowing you to focus improvement efforts where they're needed most.",
    target: "bottom-performers",
    position: "top" as const
  }
];

const formatFlockLabel = (item: any) => {
  const name = item.flockName || 'Unknown';
  const numPart = item.flockNumber !== undefined && item.flockNumber !== null ? ` #${item.flockNumber}` : '';
  const farmPart = item.houseNumber !== undefined && item.houseNumber !== null ? ` (${item.houseNumber})` : ' (N/A)';
  return `${name}${numPart}${farmPart}`;
};

const PerformanceCharts = ({ data }: PerformanceChartsProps) => {
  const [sortBy, setSortBy] = useState("fertility");
  const [chartType, setChartType] = useState("bar");
  const [showDemo, setShowDemo] = useState(false);

  // Filter data for display - only show batches with some data
  const displayData = data.filter(batch => 
    batch.hasEggQuality || batch.hasFertilityData || batch.hasQAData
  );

  // Sort data based on selected metric (handle null values)
  const sortedData = [...displayData].sort((a, b) => {
    if (sortBy === "name") return a.batchNumber.localeCompare(b.batchNumber);
    
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    
    // Put null values at the end
    if (aValue === 0 && bValue !== 0) return 1;
    if (bValue === 0 && aValue !== 0) return -1;
    
    return bValue - aValue;
  });

  const labelMap = new Map(sortedData.map((item) => [item.batchNumber, formatFlockLabel(item)]));

  // Top and bottom performers (only completed batches with fertility data)
  const completedBatches = data.filter(batch => batch.hasFertilityData && batch.fertility !== null);
  const topPerformers = [...completedBatches].sort((a, b) => b.fertility - a.fertility).slice(0, 5);
  const bottomPerformers = [...completedBatches].sort((a, b) => a.fertility - b.fertility).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Demo Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setShowDemo(true)}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View Demo
        </Button>
      </div>

      {/* Controls */}
      <Card data-demo-id="chart-controls">
        <CardHeader>
          <CardTitle>Chart Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fertility">Fertility</SelectItem>
                  <SelectItem value="hatch">Hatch Rate</SelectItem>
                  <SelectItem value="qualityScore">Quality Score</SelectItem>
                  <SelectItem value="hof">HOF</SelectItem>
                  <SelectItem value="age">Age</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ongoing Batches Status */}
      {data.filter(batch => batch.status !== 'completed').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ongoing Flocks Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data
                .filter(batch => batch.status !== 'completed')
                .map(batch => (
                  <div key={batch.batchNumber} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">{formatFlockLabel(batch)}</div>
                      <Badge variant={batch.status === 'hatching' ? 'default' : 'secondary'}>
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {batch.flockName} - Day {batch.currentDay || batch.daysSinceSet}
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-2">
                      {batch.hasQAData && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          QA Data
                        </div>
                      )}
                      {batch.hasFertilityData && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Fertility
                        </div>
                      )}
                    </div>
                    {batch.hasQAData && (
                      <div className="text-xs text-muted-foreground">
                        Latest: {batch.latestTemp}°F, {batch.latestHumidity}%
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Performance Chart */}
      <Card data-demo-id="main-chart">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>Detailed Performance Analysis</div>
            <ChartDownloadButton 
              chartId="main-performance-chart" 
              filename="detailed-performance-analysis.png" 
            />
          </CardTitle>
        </CardHeader>
        <CardContent id="main-performance-chart">
          <ResponsiveContainer width="100%" height={500}>
            {chartType === "bar" ? (
              <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="batchNumber" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tickFormatter={(val) => labelMap.get(val) || val}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <AITooltip 
                          chartType="performance-trends" 
                          data={{ batch: label, metrics: payload }} 
                          chartConfig={{ type: 'bar' }}
                          className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg"
                        >
                          <div>
                            <p className="font-medium mb-2">{labelMap.get(label) || `#${label}`}</p>
                            {payload.map((entry, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span style={{ color: entry.color }}>{String(entry.name).charAt(0).toUpperCase() + String(entry.name).slice(1)}: </span>
                                <span className="font-medium">{entry.value}%</span>
                              </div>
                            ))}
                          </div>
                        </AITooltip>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="fertility" fill="#8884d8" name="fertility" />
                <Bar dataKey="hatch" fill="#82ca9d" name="hatch" />
                <Bar dataKey="qualityScore" fill="#ffc658" name="qualityScore" />
                <Bar dataKey="hof" fill="#ff7c7c" name="hof" />
              </BarChart>
            ) : (
              <AreaChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="batchNumber" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tickFormatter={(val) => labelMap.get(val) || val}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <AITooltip 
                          chartType="performance-trends" 
                          data={{ batch: label, metrics: payload }} 
                          chartConfig={{ type: 'area' }}
                          className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg"
                        >
                          <div>
                            <p className="font-medium mb-2">{labelMap.get(label) || `#${label}`}</p>
                            {payload.map((entry, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span style={{ color: entry.color }}>{String(entry.name).charAt(0).toUpperCase() + String(entry.name).slice(1)}: </span>
                                <span className="font-medium">{entry.value}%</span>
                              </div>
                            ))}
                          </div>
                        </AITooltip>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="fertility" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="hatch" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="qualityScore" stackId="3" stroke="#ffc658" fill="#ffc658" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Correlation Analysis */}
      <Card data-demo-id="correlation-chart">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>Correlation Analysis: Age vs Performance</div>
            <ChartDownloadButton 
              chartId="correlation-analysis-chart" 
              filename="correlation-age-vs-performance.png" 
            />
          </CardTitle>
        </CardHeader>
        <CardContent id="correlation-analysis-chart">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age" name="Age" unit=" weeks" />
              <YAxis dataKey="fertility" name="Fertility" unit="%" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload;
                    return (
                      <AITooltip 
                        chartType="correlation" 
                        data={data} 
                        chartConfig={{ type: 'scatter' }}
                        className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg"
                      >
                        <div>
                          <p className="font-medium mb-2">{formatFlockLabel(data || {})}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Age:</span>
                              <span className="font-medium">{data?.age} weeks</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fertility:</span>
                              <span className="font-medium">{data?.fertility}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Breed:</span>
                              <span className="font-medium">{data?.breed}</span>
                            </div>
                          </div>
                        </div>
                      </AITooltip>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Fertility vs Age" dataKey="fertility" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-demo-id="top-performers">
          <CardHeader>
            <CardTitle className="text-green-600">Top 5 Performers (Fertility)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((item, index) => (
                <div key={item.batchNumber} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium">{formatFlockLabel(item)}</div>
                    <div className="text-sm text-gray-600">{item.flockName} - {item.breed}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{item.fertility.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Age: {item.age}w</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-demo-id="bottom-performers">
          <CardHeader>
            <CardTitle className="text-red-600">Bottom 5 Performers (Fertility)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomPerformers.map((item, index) => (
                <div key={item.batchNumber} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium">{formatFlockLabel(item)}</div>
                    <div className="text-sm text-gray-600">{item.flockName} - {item.breed}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">{item.fertility.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Age: {item.age}w</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Tutorial */}
      <DemoTutorial 
        steps={performanceDemoSteps}
        isActive={showDemo}
        onClose={() => setShowDemo(false)}
        pageName="Performance"
      />
    </div>
  );
};

export default PerformanceCharts;
