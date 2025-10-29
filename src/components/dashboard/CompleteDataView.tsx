import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AllDataTab } from "./AllDataTab";
import { EmbrexTab } from "./EmbrexTab";
import { ResidueBreakoutTab } from "./ResidueBreakoutTab";
import { EggPackQualityTab } from "./EggPackQualityTab";
import { HatchPerformanceTab } from "./HatchPerformanceTab";

interface CompleteDataViewProps {
  activeTab: string;
  searchTerm: string;
}

export const CompleteDataView = ({ activeTab, searchTerm }: CompleteDataViewProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleteData();
  }, []);

  const loadCompleteData = async () => {
    try {
      setLoading(true);

      // Fetch batches with related data
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select(`
          id,
          batch_number,
          total_eggs_set,
          eggs_cleared,
          eggs_injected,
          set_date,
          status,
          chicks_hatched,
          flocks (
            flock_number,
            flock_name,
            age_weeks,
            house_number
          )
        `)
        .order("set_date", { ascending: false });

      if (batchesError) throw batchesError;

      // Fetch fertility analysis data
      const { data: fertilityData, error: fertilityError } = await supabase
        .from("fertility_analysis")
        .select("*");

      if (fertilityError) throw fertilityError;

      // Fetch egg pack quality data
      const { data: eggPackData, error: eggPackError } = await supabase
        .from("egg_pack_quality")
        .select("*");

      if (eggPackError) throw eggPackError;

      // Fetch residue analysis for hatch performance
      const { data: residueData, error: residueError } = await supabase
        .from("residue_analysis")
        .select("*");

      if (residueError) throw residueError;

      // Combine all data
      const combinedData = (batchesData || []).map((batch) => {
        const fertility = fertilityData?.find((f) => f.batch_id === batch.id);
        const eggPack = eggPackData?.find((e) => e.batch_id === batch.id);
        const residue = residueData?.find((r) => r.batch_id === batch.id);

        return {
          batch_id: batch.id,
          batch_number: batch.batch_number,
          flock_number: batch.flocks?.flock_number,
          flock_name: batch.flocks?.flock_name,
          age_weeks: batch.flocks?.age_weeks,
          house_number: batch.flocks?.house_number,
          set_date: batch.set_date,
          status: batch.status,
          total_eggs_set: batch.total_eggs_set,
          eggs_cleared: batch.eggs_cleared,
          eggs_injected: batch.eggs_injected,
          chicks_hatched: batch.chicks_hatched,
          // Fertility data
          sample_size: fertility?.sample_size,
          fertile_eggs: fertility?.fertile_eggs,
          infertile_eggs: fertility?.infertile_eggs,
          early_dead: fertility?.early_dead,
          late_dead: fertility?.late_dead,
          fertility_percent: fertility?.fertility_percent,
          hatch_percent: fertility?.hatch_percent,
          hof_percent: fertility?.hof_percent,
          // Egg pack quality data
          cracked: eggPack?.cracked,
          dirty: eggPack?.dirty,
          small: eggPack?.small,
          large: eggPack?.large,
          epq_sample_size: eggPack?.sample_size,
          // Residue/hatch data
          residue_sample_size: residue?.sample_size,
        };
      });

      setData(combinedData);
    } catch (error) {
      console.error("Error loading complete data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  switch (activeTab) {
    case "all":
      return <AllDataTab data={data} searchTerm={searchTerm} />;
    case "embrex":
      return <EmbrexTab data={data} searchTerm={searchTerm} />;
    case "residue":
      return <ResidueBreakoutTab />;
    case "egg-pack":
      return <EggPackQualityTab data={data} searchTerm={searchTerm} />;
    case "hatch":
      return <HatchPerformanceTab data={data} searchTerm={searchTerm} />;
    default:
      return <AllDataTab data={data} searchTerm={searchTerm} />;
  }
};
