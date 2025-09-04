import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MetricKey, WeeklyDataPoint } from "./useUnitHistory";

interface GeneratePayload {
  units: string[];
  weekStart: string; // YYYY-MM-DD
  metrics: MetricKey[];
  history: WeeklyDataPoint[];
}

interface PredictionsResult {
  [unitId: string]: { [metric in MetricKey]?: number | null };
}

export const usePredictions = () => {
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<PredictionsResult | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generatePredictions = async (payload: GeneratePayload) => {
    try {
      setLoading(true);
      setPredictions(null);
      setInsights([]);

      const { data, error } = await supabase.functions.invoke("predict-metrics", {
        body: payload,
      });

      if (error) throw error;

      setPredictions((data as any)?.predictions || null);
      setInsights((data as any)?.insights || []);

      toast({ title: "Predictions ready" });
    } catch (e: any) {
      console.error("Prediction error", e);
      toast({ title: "Failed to generate predictions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { generatePredictions, predictions, insights, loading };
};
