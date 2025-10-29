import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Package, Egg, Thermometer, Droplets, RotateCcw } from 'lucide-react';

interface OverviewDashboardProps {
  data: any[];
  fertilityData?: any[];
  residueData?: any[];
  eggPackData?: any[];
  qaData?: any[];
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ 
  data, 
  fertilityData = [], 
  residueData = [],
  eggPackData = [],
  qaData = []
}) => {
  // Performance calculations
  const totalFertility = data.reduce((sum, item) => sum + item.fertility, 0);
  const averageFertility = data.length > 0 ? totalFertility / data.length : 0;

  const totalHatch = data.reduce((sum, item) => sum + item.hatch, 0);
  const averageHatch = data.length > 0 ? totalHatch / data.length : 0;

  const lowPerformanceFlocks = data.filter(item => item.fertility < 75).length;

  const hatcheryData = Object.entries(
    data.reduce((acc: { [key: string]: { total: number; count: number } }, item) => {
      const hatchery = item.hatchery;
      if (!acc[hatchery]) {
        acc[hatchery] = { total: 0, count: 0 };
      }
      acc[hatchery].total += item.fertility;
      acc[hatchery].count += 1;
      return acc;
    }, {})
  ).map(([hatchery, values]: [string, { total: number; count: number }]) => ({
    hatchery,
    avgFertility: values.total / values.count,
  }));

  const ageDistribution = Object.entries(
    data.reduce((acc: { [key: string]: number }, item) => {
      const age = item.age;
      acc[age] = (acc[age] || 0) + 1;
      return acc;
    }, {})
  ).map(([age, count]) => ({
    name: `${age} weeks`,
    count: count,
  }));

  // QA Metrics
  const qaMetrics = qaData.length > 0 ? {
    totalChecks: qaData.length,
    temperatureAlerts: qaData.filter(entry => 
      (entry.type === 'setter_temperature' && !entry.isWithinRange) ||
      (entry.type === 'rectal_temperature' && !entry.isWithinRange)
    ).length,
    sanitationFailures: qaData.filter(entry => 
      entry.type === 'tray_wash_temperature' && !entry.allPassed
    ).length,
    equipmentIssues: qaData.filter(entry => 
      entry.type === 'setter_angle' && !entry.isBalanced
    ).length,
    avgSetterTemp: qaData
      .filter(entry => entry.type === 'setter_temperature')
      .reduce((sum, entry) => sum + (entry.leftTemps.average + entry.rightTemps.average) / 2, 0) / 
      Math.max(1, qaData.filter(entry => entry.type === 'setter_temperature').length),
    recentAlerts: qaData
      .filter(entry => 
        (entry.type === 'setter_temperature' && !entry.isWithinRange) ||
        (entry.type === 'rectal_temperature' && !entry.isWithinRange) ||
        (entry.type === 'tray_wash_temperature' && !entry.allPassed) ||
        (entry.type === 'specific_gravity' && !entry.isGoodQuality)
      )
      .slice(-5)
  } : null;

  // Egg Pack Quality Metrics
  const eggPackMetrics = eggPackData.length > 0 ? {
    totalFlocks: eggPackData.length,
    avgQualityScore: eggPackData.reduce((sum: number, entry: any) => {
      const totalDefects = entry.stained + entry.dirty + entry.small + entry.cracked + entry.abnormal + entry.contaminated;
      const defectRate = (totalDefects / entry.totalEggsPulled) * 100;
      return sum + Math.max(0, 100 - defectRate);
    }, 0) / eggPackData.length,
    avgUsdRate: eggPackData.reduce((sum: number, entry: any) => 
      sum + ((entry.usd / entry.totalEggsPulled) * 100), 0) / eggPackData.length,
    totalEggsAssessed: eggPackData.reduce((sum: number, entry: any) => sum + entry.totalEggsPulled, 0),
    topDefectTypes: eggPackData.length > 0 ? (() => {
      const defectTotals = {
        stained: eggPackData.reduce((sum: number, entry: any) => sum + entry.stained, 0),
        dirty: eggPackData.reduce((sum: number, entry: any) => sum + entry.dirty, 0),
        small: eggPackData.reduce((sum: number, entry: any) => sum + entry.small, 0),
        cracked: eggPackData.reduce((sum: number, entry: any) => sum + entry.cracked, 0),
        abnormal: eggPackData.reduce((sum: number, entry: any) => sum + entry.abnormal, 0),
        contaminated: eggPackData.reduce((sum: number, entry: any) => sum + entry.contaminated, 0)
      };
      return Object.entries(defectTotals)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([type, count]) => ({ type, count }));
    })() : []
  } : null;

  // Data flow correlation
  const dataFlowAnalysis = () => {
    if (eggPackData.length === 0 || fertilityData.length === 0) return null;
    
    const correlatedFlocks = eggPackData.filter((pack: any) => 
      fertilityData.some((fert: any) => fert.flockNumber === pack.flockNumber)
    );

    return correlatedFlocks.map((pack: any) => {
      const fertility = fertilityData.find((fert: any) => fert.flockNumber === pack.flockNumber);
      const qualityScore = Math.max(0, 100 - ((pack.stained + pack.dirty + pack.small + pack.cracked + pack.abnormal + pack.contaminated) / pack.totalEggsPulled) * 100);
      
      return {
        flockNumber: pack.flockNumber,
        flock: pack.flock,
        qualityScore,
        fertilityRate: fertility?.fertilityRate || 0,
        hatchRate: fertility?.hatchOfFertile || 0
      };
    });
  };

  const correlationData = dataFlowAnalysis();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      {/* Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fertility</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageFertility.toFixed(1)}%</div>
            <p className={`text-xs ${averageFertility > 85 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              {averageFertility > 85 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {averageFertility > 85 ? 'Above target (85%)' : 'Below target (85%)'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Hatch Rate</CardTitle>
            <Egg className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageHatch.toFixed(1)}%</div>
            <p className={`text-xs ${averageHatch > 80 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              {averageHatch > 80 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {averageHatch > 80 ? 'Above target (80%)' : 'Below target (80%)'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flocks</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">
              Active breeding flocks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Count</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowPerformanceFlocks}</div>
            <p className="text-xs text-muted-foreground">
              Flocks below 75% fertility
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QA Monitoring Overview */}
      {qaMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Setter Temp</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qaMetrics.avgSetterTemp.toFixed(1)}°F</div>
              <p className={`text-xs ${qaMetrics.avgSetterTemp >= 99.5 && qaMetrics.avgSetterTemp <= 100.5 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                {qaMetrics.avgSetterTemp >= 99.5 && qaMetrics.avgSetterTemp <= 100.5 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {qaMetrics.avgSetterTemp >= 99.5 && qaMetrics.avgSetterTemp <= 100.5 ? 'Within range' : 'Out of range'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{qaMetrics.temperatureAlerts}</div>
              <p className="text-xs text-muted-foreground">
                Out of range readings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sanitation Issues</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{qaMetrics.sanitationFailures}</div>
              <p className="text-xs text-muted-foreground">
                Wash temp failures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipment Issues</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{qaMetrics.equipmentIssues}</div>
              <p className="text-xs text-muted-foreground">
                Angle imbalances
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Egg Pack Quality Overview */}
      {eggPackMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eggPackMetrics.avgQualityScore.toFixed(1)}%</div>
              <p className={`text-xs ${eggPackMetrics.avgQualityScore > 95 ? 'text-green-600' : 'text-yellow-600'} flex items-center`}>
                {eggPackMetrics.avgQualityScore > 95 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                Pre-incubation quality
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USD Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eggPackMetrics.avgUsdRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Unsettable eggs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eggs Assessed</CardTitle>
              <Egg className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eggPackMetrics.totalEggsAssessed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total quality checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Defect</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {eggPackMetrics.topDefectTypes[0]?.type || 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {eggPackMetrics.topDefectTypes[0]?.count || 0} eggs affected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QA Alerts Summary */}
      {qaMetrics && qaMetrics.recentAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent QA Alerts</CardTitle>
            <p className="text-sm text-gray-600">
              Critical issues requiring immediate attention
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qaMetrics.recentAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="font-medium text-red-800">
                        {alert.type === 'setter_temperature' && `Setter ${alert.setterNumber} Temperature Alert`}
                        {alert.type === 'rectal_temperature' && `${alert.location} Temperature Alert`}
                        {alert.type === 'tray_wash_temperature' && 'Sanitization Temperature Failure'}
                        {alert.type === 'specific_gravity' && `Flock ${alert.flockNumber} Shell Quality Issue`}
                      </div>
                      <div className="text-sm text-red-600">
                        {alert.type === 'setter_temperature' && `Avg: ${((alert.leftTemps.average + alert.rightTemps.average) / 2).toFixed(1)}°F`}
                        {alert.type === 'rectal_temperature' && `${alert.temperature}°F`}
                        {alert.type === 'tray_wash_temperature' && `Min: ${Math.min(alert.firstCheck, alert.secondCheck, alert.thirdCheck)}°F`}
                        {alert.type === 'specific_gravity' && `${alert.floatPercentage}% float rate`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {alert.checkDate || alert.testDate || alert.washDate}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fertility by Hatchery */}
        <Card>
          <CardHeader>
            <CardTitle>Fertility Performance by Hatchery</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hatcheryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hatchery" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgFertility" fill="#8884d8" name="Avg Fertility %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Flock Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Flow Correlation Analysis */}
      {correlationData && correlationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Egg Quality vs Performance Correlation</CardTitle>
            <p className="text-sm text-gray-600">
              Relationship between pre-incubation egg quality and hatch performance
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="flock" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`, 
                    name === 'qualityScore' ? 'Quality Score' : 
                    name === 'fertilityRate' ? 'Fertility Rate' : 'Hatch Rate'
                  ]}
                />
                <Area type="monotone" dataKey="qualityScore" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Area type="monotone" dataKey="fertilityRate" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Area type="monotone" dataKey="hatchRate" stackId="3" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Residue Analysis - Top Causes */}
      {residueData && residueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Residue Analysis Causes</CardTitle>
            <p className="text-sm text-gray-600">
              Common reasons for unhatched eggs
            </p>
          </CardHeader>
          <CardContent>
            {residueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={residueData.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cause" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" name="Occurrences" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-4 text-gray-500">No residue data available.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Residue Analysis - Recent Findings */}
      {residueData && residueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Residue Findings</CardTitle>
            <p className="text-sm text-gray-600">
              Latest analysis of unhatched eggs
            </p>
          </CardHeader>
          <CardContent>
            {residueData.length > 0 ? (
              <ul>
                {residueData.slice(0, 3).map((item, index) => (
                  <li key={index} className="py-2 border-b last:border-b-0">
                    <div className="font-medium">{item.cause}</div>
                    <div className="text-sm text-gray-600">Flock: {item.flock}, Date: {item.date}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 text-gray-500">No residue data available.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OverviewDashboard;
