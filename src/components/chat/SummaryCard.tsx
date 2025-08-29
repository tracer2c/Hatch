import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface SummaryCardProps {
  summary: {
    overview: string;
    keyPoints: string[];
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
  if (lowerPoint.includes('alert') || lowerPoint.includes('warning') || lowerPoint.includes('critical')) {
    return 'destructive';
  }
  if (lowerPoint.includes('increase') || lowerPoint.includes('improvement') || lowerPoint.includes('growth')) {
    return 'default';
  }
  return 'secondary';
};

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className={`border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            Key Insights Summary
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
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground font-medium mb-2">Overview</p>
            <p className="text-foreground leading-relaxed">{summary.overview}</p>
          </div>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-3">Key Points</p>
              <div className="space-y-3">
                {summary.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="flex-shrink-0 mt-0.5">
                      {getKeyPointIcon(point)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-relaxed">{point}</p>
                    </div>
                    <Badge variant={getKeyPointVariant(point)} className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};