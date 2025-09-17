import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { ChartDownloadButton } from '@/components/ui/chart-download-button';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Zap } from 'lucide-react';

interface ChartMessageProps {
  type: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area';
  title: string;
  description?: string;
  data: any[];
  config: any;
  insights?: string;
  chartId: string;
  className?: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
];

const getChartIcon = (type: string) => {
  switch (type) {
    case 'bar': return <BarChart3 className="h-5 w-5" />;
    case 'line': return <TrendingUp className="h-5 w-5" />;
    case 'pie': return <PieChartIcon className="h-5 w-5" />;
    case 'radar': return <Activity className="h-5 w-5" />;
    default: return <Zap className="h-5 w-5" />;
  }
};

export const ChartMessage: React.FC<ChartMessageProps> = ({
  type,
  title,
  description,
  data,
  config,
  insights,
  chartId,
  className = ""
}) => {
  const percentKeys = [
    ...(config?.bars?.map((b: any) => b.key) || []),
    ...(config?.lines?.map((l: any) => l.key) || []),
    ...(config?.areas?.map((a: any) => a.key) || []),
    config?.yKey,
  ].filter(Boolean);

  const looksPercent = (k: string) => typeof k === 'string' && /percent|fertility|hatch|hof|residue/i.test(k);
  const isPercentageChart = config?.yAxisFormat === 'percent' || (percentKeys.length > 0 && percentKeys.every(looksPercent));

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={config.xKey || 'name'} 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={isPercentageChart ? [0, 100] : undefined}
              tickFormatter={isPercentageChart ? (v) => `${v}%` : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.bars?.map((bar: any, index: number) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                fill={bar.color || CHART_COLORS[index % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                name={bar.name || bar.key}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={config.xKey || 'name'} 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={isPercentageChart ? [0, 100] : undefined}
              tickFormatter={isPercentageChart ? (v) => `${v}%` : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.lines?.map((line: any, index: number) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color || CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                name={line.name || line.key}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={config.xKey || 'name'} 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={isPercentageChart ? [0, 100] : undefined}
              tickFormatter={isPercentageChart ? (v) => `${v}%` : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.areas?.map((area: any, index: number) => (
              <Area
                key={area.key}
                type="monotone"
                dataKey={area.key}
                stroke={area.color || CHART_COLORS[index % CHART_COLORS.length]}
                fill={area.color || CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.3}
                name={area.name || area.key}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart width={400} height={300}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey={config.valueKey || 'value'}
              nameKey={config.nameKey || 'name'}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart width={400} height={300} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={config.angleKey || 'metric'} />
            <PolarRadiusAxis domain={[0, 100]} />
            {config.radars?.map((radar: any, index: number) => (
              <Radar
                key={radar.key}
                name={radar.name || radar.key}
                dataKey={radar.key}
                stroke={radar.color || CHART_COLORS[index % CHART_COLORS.length]}
                fill={radar.color || CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.25}
              />
            ))}
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={config.xKey || 'x'} 
              type="number"
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              dataKey={config.yKey || 'y'}
              type="number"
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={isPercentageChart ? [0, 100] : undefined}
              tickFormatter={isPercentageChart ? (v) => `${v}%` : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Scatter
              name={config.name || 'Data'}
              data={data}
              fill={config.color || CHART_COLORS[0]}
            />
          </ScatterChart>
        );

      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getChartIcon(type)}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <ChartDownloadButton 
            chartId={chartId}
            filename={`${title.toLowerCase().replace(/\s+/g, '-')}-chart.png`}
          />
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div id={chartId} className="w-full">
          <ChartContainer config={config} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        
        {insights && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2 text-muted-foreground">Key Insights</h4>
            <p className="text-sm leading-relaxed">{insights}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};