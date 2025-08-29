import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          batches (batch_number, status),
          machines (machine_number, machine_type)
        `)
        .in('status', ['active', 'acknowledged'])
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useActiveAlerts = () => {
  return useQuery({
    queryKey: ['active-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          batches (batch_number, status),
          machines (machine_number, machine_type)
        `)
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useCriticalAlerts = () => {
  return useQuery({
    queryKey: ['critical-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          batches (batch_number, status),
          machines (machine_number, machine_type)
        `)
        .eq('status', 'active')
        .eq('severity', 'critical')
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const acknowledgedBy = profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : 'Unknown User';
      
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: acknowledgedBy
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['critical-alerts'] });
      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert.",
        variant: "destructive",
      });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['critical-alerts'] });
      toast({
        title: "Alert Resolved",
        description: "Alert has been marked as resolved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to resolve alert.",
        variant: "destructive",
      });
    },
  });
};

export const useDismissAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'dismissed'
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['critical-alerts'] });
      toast({
        title: "Alert Dismissed",
        description: "Alert has been dismissed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to dismiss alert.",
        variant: "destructive",
      });
    },
  });
};

export const useCheckAlerts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Check for temperature/humidity alerts from recent QA data
      const { data: qaData, error: qaError } = await supabase
        .from('qa_monitoring')
        .select(`
          *,
          batches (id, batch_number, status)
        `)
        .gte('check_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('check_date', { ascending: false });

      if (qaError) throw qaError;

      const alertsToCreate = [];

      // Check temperature and humidity thresholds
      for (const qa of qaData || []) {
        if (qa.temperature < 99 || qa.temperature > 101) {
          alertsToCreate.push({
            alert_type: 'temperature',
            batch_id: qa.batch_id,
            severity: qa.temperature < 97 || qa.temperature > 103 ? 'critical' : 'warning',
            title: `Temperature Alert - ${qa.batches?.batch_number}`,
            message: `Temperature reading of ${qa.temperature}°F is outside optimal range (99-101°F)`,
            current_temperature: qa.temperature,
            batch_day: qa.day_of_incubation
          });
        }

        if (qa.humidity < 55 || qa.humidity > 65) {
          alertsToCreate.push({
            alert_type: 'humidity',
            batch_id: qa.batch_id,
            severity: qa.humidity < 45 || qa.humidity > 75 ? 'critical' : 'warning',
            title: `Humidity Alert - ${qa.batches?.batch_number}`,
            message: `Humidity reading of ${qa.humidity}% is outside optimal range (55-65%)`,
            current_humidity: qa.humidity,
            batch_day: qa.day_of_incubation
          });
        }
      }

      // Check for critical day alerts
      const { data: batches, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .in('status', ['setting', 'incubating', 'hatching']);

      if (batchError) throw batchError;

      for (const batch of batches || []) {
        const daysSinceSet = Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24));
        
        // Check for critical days (7, 14, 18, 21)
        if ([7, 14, 18, 21].includes(daysSinceSet)) {
          alertsToCreate.push({
            alert_type: 'critical_day',
            batch_id: batch.id,
            severity: 'info',
            title: `Critical Day ${daysSinceSet} - ${batch.batch_number}`,
            message: `Batch ${batch.batch_number} has reached day ${daysSinceSet} - special attention required`,
            batch_day: daysSinceSet
          });
        }
      }

      // Insert new alerts (only if they don't already exist for today)
      if (alertsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('alerts')
          .insert(alertsToCreate);

        if (insertError) throw insertError;
      }

      return alertsToCreate.length;
    },
    onSuccess: (alertCount) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['critical-alerts'] });
      
      if (alertCount > 0) {
        console.log(`Generated ${alertCount} new alerts`);
      }
    },
  });
};