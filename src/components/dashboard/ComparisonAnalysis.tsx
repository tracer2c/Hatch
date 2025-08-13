import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Button } from "@/components/ui/button";
import { Check, Activity, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

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
  const [comparisonMetric, setComparisonMetric] = useState("fertility");

  const handleItemSelect = (batchNumber: string) => {
    if (selectedItems.includes(batchNumber)) {
      setSelectedItems(selectedItems.filter(item => item !== batchNumber));
    } else if (selectedItems.length < 5) {
      setSelectedItems([...selectedItems, batchNumber]);
    }
  };

  // Filter data for comparison - only show batches with some meaningful data
  const displayData = data.filter(batch => 
    batch.hasEggQuality || batch.hasFertilityData || batch.hasQAData
  );

  const selectedData = displayData.filter(item => selectedItems.includes(item.batchNumber));

  // Breed comparison data - only include batches with fertility data for breed comparison
  const breedComparison = data
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
      acc[item.breed].earlyDead.push(item.earlyDead || 0);
      return acc;
    }, {} as any);

  const breedStats = Object.keys(breedComparison).map(breed => {
    const stats = breedComparison[breed];
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
    <div className="space-y-8">
      {/* Item Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Select Flocks to Compare
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose up to 5 flocks for detailed performance comparison. Click on flocks to select or deselect them.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
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
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm">{formatFlockLabel(item)}</div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Flock:</span>
                          <span className="text-xs font-medium">{item.flockName}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Status:</span>
                          <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Fertility:</span>
                          <span className="text-xs font-medium">
                            {item.fertility ? `${item.fertility.toFixed(1)}%` : 'Pending'}
                          </span>
                        </div>
                        
                        {item.hatch && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Hatch Rate:</span>
                            <span className="text-xs font-medium">{item.hatch.toFixed(1)}%</span>
                          </div>
                        )}
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

      {/* Breed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Breed Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={breedStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="breed" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${typeof value === 'number' ? value.toFixed(1) : value}%`, 
                    String(name).replace('avg', 'Avg ')
                  ]}
                />
                <Bar dataKey="avgFertility" fill="hsl(var(--chart-1))" name="avgFertility" radius={[4,4,0,0]} />
                <Bar dataKey="avgHatch" fill="hsl(var(--chart-2))" name="avgHatch" radius={[4,4,0,0]} />
                <Bar dataKey="avgQualityScore" fill="hsl(var(--chart-3))" name="avgQualityScore" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Breed Statistics</h3>
              {breedStats.map(stat => (
                <div key={stat.breed} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-lg">{stat.breed}</h4>
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
        </CardContent>
      </Card>

      {/* Selected Items Comparison */}
      {selectedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Items Detailed Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Radar Chart */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Performance Radar Chart</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData.length > 0 ? radarData : []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Fertility" dataKey="fertility" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    <Radar name="Hatch Rate" dataKey="hatch" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.25} />
                    <Radar name="Quality Score" dataKey="qualityScore" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.25} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Comparison Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detailed Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Flock</th>
                        <th className="text-center p-3 text-sm font-medium text-muted-foreground">Fertility</th>
                        <th className="text-center p-3 text-sm font-medium text-muted-foreground">Hatch</th>
                        <th className="text-center p-3 text-sm font-medium text-muted-foreground">Quality</th>
                        <th className="text-center p-3 text-sm font-medium text-muted-foreground">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedData.map(item => (
                        <tr key={item.batchNumber} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="font-medium text-sm">{formatFlockLabel(item)}</div>
                          </td>
                          <td className="p-3 text-center text-sm">
                            {item.fertility ? `${item.fertility.toFixed(1)}%` : 'Pending'}
                          </td>
                          <td className="p-3 text-center text-sm">
                            {item.hatch ? `${item.hatch.toFixed(1)}%` : 'Pending'}
                          </td>
                          <td className="p-3 text-center text-sm">
                            {item.qualityScore ? `${item.qualityScore.toFixed(1)}%` : 'Pending'}
                          </td>
                          <td className="p-3 text-center text-sm">{item.age}w</td>
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

    </div>
  );
};

export default ComparisonAnalysis;
