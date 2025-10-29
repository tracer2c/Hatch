import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

export interface ComparisonFilters {
  dateRange: { from: Date; to: Date };
  unitIds: string[];
  houseNumbers: string[];
  batchStatus: string[];
  limit: number;
}

export const useComparisonData = (filters: ComparisonFilters) => {
  return useQuery({
    queryKey: ['comparison-data', filters],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          status,
          total_eggs_set,
          set_date,
          actual_hatch_date,
          chicks_hatched,
          eggs_injected,
          flocks (
            flock_number,
            flock_name,
            age_weeks,
            breed,
            house_number
          ),
          units (
            id,
            name
          ),
          fertility_analysis (
            fertility_percent,
            hatch_percent,
            hof_percent,
            hoi_percent,
            early_dead,
            late_dead,
            sample_size
          ),
          egg_pack_quality (
            grade_a,
            grade_b,
            grade_c,
            cracked,
            dirty,
            sample_size
          ),
          qa_monitoring (
            temperature,
            humidity,
            day_of_incubation,
            check_date
          ),
          residue_analysis (
            pipped_not_hatched,
            total_residue_count
          )
        `)
        .gte('set_date', format(filters.dateRange.from, 'yyyy-MM-dd'))
        .lte('set_date', format(filters.dateRange.to, 'yyyy-MM-dd'))
        .order('set_date', { ascending: false });

      // Apply filters
      if (filters.unitIds.length > 0) {
        query = query.in('unit_id', filters.unitIds);
      }

      if (filters.batchStatus.length > 0) {
        query = query.in('status', filters.batchStatus as ("planned" | "setting" | "incubating" | "hatching" | "completed" | "cancelled")[]);
      }

      if (filters.limit > 0) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process and enrich the data
      const processedData = (data || []).map((batch: any) => {
        const fertility = batch.fertility_analysis?.[0];
        const eggQuality = batch.egg_pack_quality?.[0];
        const qaData = batch.qa_monitoring || [];
        const residue = batch.residue_analysis?.[0];

        // Filter by house numbers if specified
        if (filters.houseNumbers.length > 0) {
          const houseNumber = batch.flocks?.house_number;
          if (!houseNumber || !filters.houseNumbers.includes(houseNumber)) {
            return null;
          }
        }

        // Calculate quality score
        const qualityScore = eggQuality && eggQuality.sample_size
          ? (((eggQuality.sample_size - (eggQuality.grade_c || 0) - (eggQuality.cracked || 0) - (eggQuality.dirty || 0)) / eggQuality.sample_size) * 100)
          : null;

        // Calculate days since set
        const daysSinceSet = batch.set_date 
          ? Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24)) 
          : 0;

        // Calculate HOI (Hatch of Injected) - chicks hatched / eggs injected
        const hoiPercent = batch.eggs_injected > 0 
          ? (batch.chicks_hatched / batch.eggs_injected) * 100 
          : null;

        // Calculate embryonic mortality percentages
        const totalFertile = fertility?.sample_size || 0;
        const earlyDeadPercent = fertility && totalFertile > 0 ? ((fertility.early_dead || 0) / totalFertile) * 100 : 0;
        const lateDeadPercent = fertility && totalFertile > 0 ? ((fertility.late_dead || 0) / totalFertile) * 100 : 0;

        return {
          id: batch.id,
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number || 0,
          age: batch.flocks?.age_weeks || 0,
          breed: batch.flocks?.breed || 'Unknown',
          houseNumber: batch.flocks?.house_number || 'N/A',
          unitName: batch.units?.name || 'Unknown',
          fertility: fertility?.fertility_percent,
          hatch: fertility?.hatch_percent,
          hof: fertility?.hof_percent,
          hoi: hoiPercent,
          qualityScore,
          totalEggs: batch.total_eggs_set,
          status: batch.status,
          setDate: batch.set_date,
          actualHatchDate: batch.actual_hatch_date,
          daysSinceSet,
          chicksHatched: batch.chicks_hatched,
          eggsInjected: batch.eggs_injected,
          // Data availability flags
          hasEggQuality: !!eggQuality,
          hasFertilityData: !!fertility,
          hasQAData: qaData.length > 0,
          hasResidueData: !!residue,
          // Latest QA readings
          latestTemp: qaData.length > 0 ? qaData[qaData.length - 1]?.temperature : null,
          latestHumidity: qaData.length > 0 ? qaData[qaData.length - 1]?.humidity : null,
          currentDay: qaData.length > 0 ? qaData[qaData.length - 1]?.day_of_incubation : daysSinceSet,
          // Mortality data
          earlyDeadPercent,
          lateDeadPercent,
          pippedNotHatched: residue?.pipped_not_hatched || 0,
          totalResidueCount: residue?.total_residue_count || 0
        };
      }).filter(Boolean); // Remove null entries from house filtering

      return processedData;
    },
    enabled: !!(filters.dateRange.from && filters.dateRange.to),
  });
};

export const useUnitsData = () => {
  return useQuery({
    queryKey: ['units-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
};

export const useHouseNumbers = () => {
  return useQuery({
    queryKey: ['house-numbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flocks')
        .select('house_number')
        .not('house_number', 'is', null);

      if (error) throw error;
      
      // Get unique house numbers and sort them
      const uniqueHouses = [...new Set(data?.map(f => f.house_number))].sort();
      return uniqueHouses || [];
    },
  });
};