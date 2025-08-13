import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBatchData = () => {
  return useQuery({
    queryKey: ['batches-with-relations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (
            flock_number,
            flock_name,
            age_weeks,
            breed,
            house_number,
            total_birds
          ),
          machines (
            machine_number,
            machine_type,
            capacity,
            location,
            status
          ),
          fertility_analysis (*),
          egg_pack_quality (*),
          qa_monitoring (*),
          residue_analysis (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useActiveBatches = () => {
  return useQuery({
    queryKey: ['active-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (flock_number, flock_name, age_weeks),
          machines (machine_number, machine_type, status)
        `)
        .in('status', ['setting', 'incubating', 'hatching'])
        .order('set_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useBatchPerformanceMetrics = () => {
  return useQuery({
    queryKey: ['batch-performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          status,
          total_eggs_set,
          set_date,
           flocks (flock_number, flock_name, age_weeks, breed, house_number),
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
          )
        `)
        .order('set_date', { ascending: false });

      if (error) throw error;
      
      // Calculate performance metrics for all batches
      return data?.map(batch => {
        const fertility = batch.fertility_analysis?.[0];
        const eggQuality = batch.egg_pack_quality?.[0];
        const qaData = batch.qa_monitoring || [];
        
        const qualityScore = eggQuality ? 
          (((eggQuality.sample_size - eggQuality.grade_c - eggQuality.cracked - eggQuality.dirty) / eggQuality.sample_size) * 100) : null;
        
        // Calculate days since set for ongoing batches
        const daysSinceSet = Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine data availability
        const hasEggQuality = !!eggQuality;
        const hasFertilityData = !!fertility;
        const hasQAData = qaData.length > 0;
        
        return {
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number || 0,
          age: batch.flocks?.age_weeks || 0,
          breed: batch.flocks?.breed || 'unknown',
          houseNumber: batch.flocks?.house_number ?? null,
          fertility: fertility?.fertility_percent || null,
          hatch: fertility?.hatch_percent || null,
          hof: fertility?.hof_percent || null,
          hoi: fertility?.hoi_percent || null,
          earlyDead: fertility ? ((fertility.early_dead || 0) / (fertility.sample_size || 1)) * 100 : null,
          qualityScore,
          totalEggs: batch.total_eggs_set,
          status: batch.status,
          daysSinceSet,
          setDate: batch.set_date,
          // Data availability flags
          hasEggQuality,
          hasFertilityData,
          hasQAData,
          // Latest QA readings for ongoing batches
          latestTemp: hasQAData ? qaData[qaData.length - 1]?.temperature : null,
          latestHumidity: hasQAData ? qaData[qaData.length - 1]?.humidity : null,
          currentDay: hasQAData ? qaData[qaData.length - 1]?.day_of_incubation : daysSinceSet
        };
      }) || [];
    },
  });
};

export const useOngoingBatchMetrics = () => {
  return useQuery({
    queryKey: ['ongoing-batch-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          status,
          total_eggs_set,
          set_date,
          flocks (flock_number, flock_name, age_weeks, breed),
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
          )
        `)
        .in('status', ['setting', 'incubating', 'hatching'])
        .order('set_date', { ascending: false });

      if (error) throw error;
      
      return data?.map(batch => {
        const eggQuality = batch.egg_pack_quality?.[0];
        const qaData = batch.qa_monitoring || [];
        
        const qualityScore = eggQuality ? 
          ((eggQuality.grade_a + eggQuality.grade_b) / eggQuality.sample_size) * 100 : null;
        
        const daysSinceSet = Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number || 0,
          age: batch.flocks?.age_weeks || 0,
          breed: batch.flocks?.breed || 'unknown',
          totalEggs: batch.total_eggs_set,
          status: batch.status,
          daysSinceSet,
          setDate: batch.set_date,
          qualityScore,
          hasEggQuality: !!eggQuality,
          hasQAData: qaData.length > 0,
          latestTemp: qaData.length > 0 ? qaData[qaData.length - 1]?.temperature : null,
          latestHumidity: qaData.length > 0 ? qaData[qaData.length - 1]?.humidity : null,
          currentDay: qaData.length > 0 ? qaData[qaData.length - 1]?.day_of_incubation : daysSinceSet,
          progressPercent: Math.min(100, (daysSinceSet / 21) * 100)
        };
      }) || [];
    },
  });
};

export const useCompletedBatchMetrics = () => {
  return useQuery({
    queryKey: ['completed-batch-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          status,
          total_eggs_set,
          set_date,
          flocks (flock_number, flock_name, age_weeks, breed),
          fertility_analysis (
            fertility_percent,
            hatch_percent,
            hof_percent,
            early_dead,
            late_dead,
            sample_size
          ),
          residue_analysis (
            pipped_not_hatched,
            total_residue_count
          )
        `)
        .eq('status', 'completed')
        .not('fertility_analysis', 'is', null)
        .order('set_date', { ascending: false });

      if (error) throw error;
      
      return data?.map(batch => {
        const fertility = batch.fertility_analysis?.[0];
        const residue = batch.residue_analysis?.[0];
        
        // Calculate embryonic mortality data
        const earlyDead = fertility?.early_dead || 0;
        const lateDead = fertility?.late_dead || 0;
        const pipped = residue?.pipped_not_hatched || 0;
        
        // Calculate mid dead as remaining dead embryos
        const totalFertile = fertility?.sample_size || 0;
        const totalHatched = Math.round((totalFertile * (fertility?.hatch_percent || 0)) / 100);
        const totalDead = totalFertile - totalHatched;
        const midDead = Math.max(0, totalDead - earlyDead - lateDead - pipped);
        
        return {
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number || 0,
          age: batch.flocks?.age_weeks || 0,
          breed: batch.flocks?.breed || 'unknown',
          fertility: fertility?.fertility_percent || 0,
          hatch: fertility?.hatch_percent || 0,
          hof: fertility?.hof_percent || 0,
          totalEggs: batch.total_eggs_set,
          status: batch.status,
          setDate: batch.set_date,
          // Embryonic mortality data
          earlyDead,
          midDead,
          lateDead,
          pipped
        };
      }) || [];
    },
  });
};

export const useQAAlerts = () => {
  return useQuery({
    queryKey: ['qa-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_monitoring')
        .select(`
          *,
          batches (
            batch_number,
            flocks (flock_number, flock_name)
          )
        `)
        .or('temperature.lt.99,temperature.gt.101,humidity.lt.55,humidity.gt.65')
        .order('check_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
};

export const useActiveBatchFlowData = () => {
  return useQuery({
    queryKey: ['active-batch-flow-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          status,
          total_eggs_set,
          set_date,
          flocks (flock_number, flock_name, age_weeks, breed),
          fertility_analysis (
            fertility_percent,
            hatch_percent,
            hof_percent,
            early_dead,
            late_dead,
            sample_size
          ),
          residue_analysis (
            pipped_not_hatched,
            total_residue_count
          )
        `)
        .in('status', ['setting', 'incubating', 'hatching'])
        .order('set_date', { ascending: false });

      if (error) throw error;
      
      return data?.map(batch => {
        const fertility = batch.fertility_analysis?.[0];
        const residue = batch.residue_analysis?.[0];
        
        // Use actual fertility data if available, otherwise estimate based on flock age and breed
        const estimatedFertility = !fertility ? (
          batch.flocks?.age_weeks && batch.flocks.age_weeks < 60 ? 85 : 75
        ) : fertility.fertility_percent;
        
        // Use actual hatch data if available, otherwise estimate
        const estimatedHatch = !fertility?.hatch_percent ? 85 : fertility.hatch_percent;
        
        // Calculate embryonic mortality data
        const earlyDead = fertility?.early_dead || 0;
        const lateDead = fertility?.late_dead || 0;
        const pipped = residue?.pipped_not_hatched || 0;
        
        // Calculate mid dead as remaining dead embryos (estimated if no actual data)
        const totalFertile = fertility?.sample_size || Math.round((batch.total_eggs_set * estimatedFertility) / 100);
        const totalHatched = Math.round((totalFertile * estimatedHatch) / 100);
        const totalDead = totalFertile - totalHatched;
        const midDead = fertility ? Math.max(0, totalDead - earlyDead - lateDead - pipped) : Math.round(totalDead * 0.3);
        
        return {
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number || 0,
          age: batch.flocks?.age_weeks || 0,
          breed: batch.flocks?.breed || 'unknown',
          fertility: estimatedFertility || 80,
          hatch: estimatedHatch || 85,
          hof: fertility?.hof_percent || 80,
          totalEggs: batch.total_eggs_set,
          status: batch.status,
          setDate: batch.set_date,
          isProjected: !fertility || !fertility.hatch_percent,
          hasActualFertility: !!fertility,
          hasActualResidue: !!residue,
          // Embryonic mortality data
          earlyDead,
          midDead,
          lateDead,
          pipped
        };
      }) || [];
    },
  });
};

export const useMachineUtilization = () => {
  return useQuery({
    queryKey: ['machine-utilization'],
    queryFn: async () => {
      const { data: machines, error: machinesError } = await supabase
        .from('machines')
        .select('*');

      if (machinesError) throw machinesError;

      const { data: activeBatches, error: batchesError } = await supabase
        .from('batches')
        .select('machine_id, status, total_eggs_set')
        .in('status', ['setting', 'incubating', 'hatching']);

      if (batchesError) throw batchesError;

      return machines?.map(machine => {
        const activeBatch = activeBatches?.find(b => b.machine_id === machine.id);
        const utilization = activeBatch 
          ? (activeBatch.total_eggs_set / machine.capacity) * 100
          : 0;

        return {
          ...machine,
          utilization,
          currentStatus: activeBatch?.status || 'available',
          currentLoad: activeBatch?.total_eggs_set || 0
        };
      }) || [];
    },
  });
};