import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartMessage } from './ChartMessage';
import { MessageFormatter } from './MessageFormatter';
import { TrendingUp, AlertTriangle, CheckCircle, Download, BarChart3 } from 'lucide-react';

interface AnalyticsMessageProps {
  data: {
    type: 'analytics';
    title: string;
    summary: string;
    charts?: Array<{
      type: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'area';
      title: string;
      description?: string;
      data: any[];
      config: any;
      insights?: string;
    }>;
    metrics?: Array<{
      label: string;
      value: string | number;
      change?: number;
      trend?: 'up' | 'down' | 'stable';
      status?: 'good' | 'warning' | 'critical';
    }>;
    insights?: string[];
    
    actions?: Array<{
      label: string;
      type: 'download' | 'drill-down' | 'compare';
      data?: any;
    }>;
  };
}

const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    default: return null;
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'good': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const AnalyticsMessage: React.FC<AnalyticsMessageProps> = ({ data }) => {
  const handleAction = (action: any) => {
    if (action.type === 'download' && action.data) {
      const blob = new Blob([JSON.stringify(action.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${action.label.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">{data.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <MessageFormatter content={data.summary} />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {data.metrics && data.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.metrics.map((metric, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </span>
                    {metric.trend && getTrendIcon(metric.trend)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{metric.value}</span>
                    {metric.change !== undefined && (
                      <Badge variant="outline" className={getStatusColor(metric.status)}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {data.charts && data.charts.map((chart, index) => (
        <ChartMessage
          key={index}
          type={chart.type}
          title={chart.title}
          description={chart.description}
          data={chart.data}
          config={chart.config}
          insights={chart.insights}
          chartId={`analytics-chart-${index}`}
        />
      ))}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <MessageFormatter content={insight} className="text-sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Actions */}
      {data.actions && data.actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-2"
                >
                  {action.type === 'download' && <Download className="h-4 w-4" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};