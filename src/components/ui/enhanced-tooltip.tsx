import React, { useState } from 'react';
import { Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useChartInsights } from '@/hooks/useChartInsights';
import { Button } from './button';

interface EnhancedTooltipProps {
  chartType: string;
  data: any;
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  className?: string;
}

export const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  chartType,
  data,
  title,
  metrics,
  className = ""
}) => {
  const { explanation, isLoading, error, getInsight } = useChartInsights();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const truncateLength = 80;
  const shouldTruncate = explanation && explanation.length > truncateLength;
  const displayText = shouldTruncate && !isExpanded 
    ? explanation.slice(0, truncateLength) + "..." 
    : explanation;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      getInsight(chartType, data);
    }, 300);

    return () => clearTimeout(timer);
  }, [chartType, data, getInsight]);

  return (
    <div className={`bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px] max-w-sm ${className}`}>
      {/* Original content */}
      <div className="mb-3">
        <p className="font-medium mb-2">{title}</p>
        <div className="space-y-1">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <span style={{ color: metric.color }} className="text-sm">
                {metric.label}:
              </span>
              <span className="font-medium text-sm">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Insight Section */}
      <div className="border-t border-border pt-3" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Insight</span>
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Analyzing...</span>
          </div>
        )}
        
        {error && (
          <p className="text-xs text-destructive">
            Unable to generate insight
          </p>
        )}
        
        {explanation && !isLoading && (
          <div className="space-y-2">
            <div className="max-w-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {displayText}
              </p>
            </div>
            
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onPointerDown={(e) => {
                  console.log('Enhanced Tooltip button clicked, expanded:', isExpanded);
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative z-50"
                style={{ pointerEvents: 'auto' }}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Read more
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};