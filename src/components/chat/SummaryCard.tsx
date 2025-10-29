import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface SummaryCardProps {
  summary: {
    overview: string;
    keyPoints: string[];
    isExecutive?: boolean;
  };
  className?: string;
}

const getKeyPointIcon = (point: string) => {
  const lowerPoint = point.toLowerCase();
  if (lowerPoint.includes('alert') || lowerPoint.includes('warning') || lowerPoint.includes('critical')) {
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  }
  if (lowerPoint.includes('increase') || lowerPoint.includes('improvement') || lowerPoint.includes('growth')) {
    return <TrendingUp className="h-4 w-4 text-success" />;
  }
  if (lowerPoint.includes('complete') || lowerPoint.includes('success') || lowerPoint.includes('good')) {
    return <CheckCircle className="h-4 w-4 text-success" />;
  }
  return <Lightbulb className="h-4 w-4 text-primary" />;
};

const getKeyPointVariant = (point: string) => {
  const lowerPoint = point.toLowerCase();
  if (lowerPoint.includes('alert') || lowerPoint.includes('warning') || lowerPoint.includes('critical') || lowerPoint.includes('urgent')) {
    return 'destructive';
  }
  if (lowerPoint.includes('increase') || lowerPoint.includes('improvement') || lowerPoint.includes('growth') || lowerPoint.includes('target')) {
    return 'default';
  }
  return 'secondary';
};

const getExecutiveStatus = (point: string) => {
  const lowerPoint = point.toLowerCase();
  if (lowerPoint.includes('alert') || lowerPoint.includes('critical') || lowerPoint.includes('urgent') || lowerPoint.includes('below') || lowerPoint.includes('under')) {
    return 'critical';
  }
  if (lowerPoint.includes('warning') || lowerPoint.includes('attention') || lowerPoint.includes('review')) {
    return 'warning';
  }
  if (lowerPoint.includes('good') || lowerPoint.includes('above') || lowerPoint.includes('exceeding') || lowerPoint.includes('success')) {
    return 'success';
  }
  return 'neutral';
};

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isExecutive = summary.isExecutive;

  return (
    <Card className={`border-l-4 ${isExecutive ? 'border-l-accent bg-gradient-to-r from-accent/10 to-primary/5' : 'border-l-primary bg-gradient-to-r from-primary/5 to-transparent'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isExecutive ? 'text-accent-foreground' : ''}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isExecutive ? 'bg-accent/20' : 'bg-primary/10'}`}>
              {isExecutive ? <TrendingUp className="h-4 w-4 text-accent" /> : <Lightbulb className="h-4 w-4 text-primary" />}
            </div>
            {isExecutive ? 'Executive Summary' : 'Key Insights Summary'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Overview */}
          <div className={`rounded-lg p-4 ${isExecutive ? 'bg-accent/5 border border-accent/20' : 'bg-muted/50'}`}>
            <p className={`text-sm font-medium mb-2 ${isExecutive ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
              {isExecutive ? 'Executive Overview' : 'Overview'}
            </p>
            <p className="text-foreground leading-relaxed">{summary.overview}</p>
          </div>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <div>
              <p className={`text-sm font-medium mb-3 ${isExecutive ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                {isExecutive ? 'Critical Insights & Actions' : 'Key Points'}
              </p>
              <div className="space-y-3">
                {summary.keyPoints.map((point, index) => {
                  const status = isExecutive ? getExecutiveStatus(point) : null;
                  return (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isExecutive && status === 'critical' 
                        ? 'bg-destructive/5 border-destructive/20' 
                        : isExecutive && status === 'warning'
                        ? 'bg-warning/5 border-warning/20'
                        : isExecutive && status === 'success'
                        ? 'bg-success/5 border-success/20'
                        : 'bg-background border'
                    }`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {getKeyPointIcon(point)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed">{point}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExecutive && status && (
                          <div className={`w-2 h-2 rounded-full ${
                            status === 'critical' ? 'bg-destructive' :
                            status === 'warning' ? 'bg-warning' :
                            status === 'success' ? 'bg-success' : 'bg-muted'
                          }`} />
                        )}
                        <Badge variant={getKeyPointVariant(point)} className="text-xs">
                          {isExecutive ? `P${index + 1}` : `#${index + 1}`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};