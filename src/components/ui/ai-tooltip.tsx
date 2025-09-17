import React, { useEffect, useState } from 'react';
import { Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useChartInsights } from '@/hooks/useChartInsights';
import { Button } from './button';

interface AITooltipProps {
  chartType: string;
  data: any;
  chartConfig?: any;
  children: React.ReactNode;
  className?: string;
}

export const AITooltip: React.FC<AITooltipProps> = ({
  chartType,
  data,
  chartConfig,
  children,
  className = ""
}) => {
  const { explanation, isLoading, error, getInsight } = useChartInsights();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const truncateLength = 80;
  const shouldTruncate = explanation && explanation.length > truncateLength;
  const displayText = shouldTruncate && !isExpanded 
    ? explanation.slice(0, truncateLength) + "..." 
    : explanation;

  useEffect(() => {
    // Debounce the insight request
    const timer = setTimeout(() => {
      getInsight(chartType, data, chartConfig);
    }, 500);

    return () => clearTimeout(timer);
  }, [chartType, data, chartConfig, getInsight]);

  return (
    <div className={`space-y-3 ${className}`} style={{ pointerEvents: 'auto' }}>
      {/* Original tooltip content */}
      {children}
      
      {/* AI Insight Section */}
      <div className="border-t border-border pt-3" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Insight</span>
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Analyzing data...</span>
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
                  console.log('AI Tooltip button clicked, expanded:', isExpanded);
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