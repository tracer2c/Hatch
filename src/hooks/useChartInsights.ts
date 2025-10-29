import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChartInsightsReturn {
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
  getInsight: (chartType: string, data: any, chartConfig?: any) => Promise<void>;
}

const explanationCache = new Map<string, string>();

export const useChartInsights = (): UseChartInsightsReturn => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInsight = useCallback(async (chartType: string, data: any, chartConfig?: any) => {
    // Create cache key from chart type and data
    const cacheKey = `${chartType}-${JSON.stringify(data).slice(0, 100)}`;
    
    // Check cache first
    if (explanationCache.has(cacheKey)) {
      setExplanation(explanationCache.get(cacheKey)!);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: apiError } = await supabase.functions.invoke('chart-insights', {
        body: {
          chartType,
          data,
          chartConfig
        }
      });

      if (apiError) {
        throw new Error(apiError.message);
      }

      const insight = result.explanation;
      explanationCache.set(cacheKey, insight);
      setExplanation(insight);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get insight';
      setError(errorMessage);
      console.error('Error getting chart insight:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    explanation,
    isLoading,
    error,
    getInsight
  };
};