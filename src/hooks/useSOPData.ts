import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSOPTemplates = () => {
  return useQuery({
    queryKey: ['sop-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('day_of_incubation', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useDailyChecklistItems = (dayOfIncubation?: number) => {
  return useQuery({
    queryKey: ['daily-checklist-items', dayOfIncubation],
    queryFn: async () => {
      let query = supabase
        .from('daily_checklist_items')
        .select(`
          *,
          sop_templates (
            title,
            category,
            day_of_incubation
          )
        `)
        .order('order_index', { ascending: true });

      if (dayOfIncubation) {
        query = query.contains('applicable_days', [dayOfIncubation]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

export const useChecklistCompletions = (batchId?: string, dayOfIncubation?: number) => {
  return useQuery({
    queryKey: ['checklist-completions', batchId, dayOfIncubation],
    queryFn: async () => {
      let query = supabase
        .from('checklist_completions')
        .select(`
          *,
          daily_checklist_items (
            title,
            description,
            is_required
          )
        `)
        .order('completed_at', { ascending: false });

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      if (dayOfIncubation) {
        query = query.eq('day_of_incubation', dayOfIncubation);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!batchId || !!dayOfIncubation,
  });
};

export const useCompleteChecklistItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      checklistItemId,
      batchId,
      dayOfIncubation,
      completedBy,
      notes
    }: {
      checklistItemId: string;
      batchId: string;
      dayOfIncubation: number;
      completedBy: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('checklist_completions')
        .upsert({
          checklist_item_id: checklistItemId,
          batch_id: batchId,
          day_of_incubation: dayOfIncubation,
          completed_by: completedBy,
          notes: notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-completions'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      toast({
        title: "Checklist Item Completed",
        description: "Item has been marked as complete.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete checklist item.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateSOPTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: {
      title: string;
      description?: string;
      category: string;
      day_of_incubation?: number;
      content?: any;
    }) => {
      const { error } = await supabase
        .from('sop_templates')
        .insert(template);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-templates'] });
      toast({
        title: "SOP Template Created",
        description: "New template has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create SOP template.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: {
      sop_template_id?: string;
      title: string;
      description?: string;
      order_index: number;
      is_required: boolean;
      applicable_days: number[];
    }) => {
      const { error } = await supabase
        .from('daily_checklist_items')
        .insert(item);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-checklist-items'] });
      toast({
        title: "Checklist Item Created",
        description: "New checklist item has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create checklist item.",
        variant: "destructive",
      });
    },
  });
};

export const useBatchChecklistProgress = (batchId: string, dayOfIncubation: number) => {
  return useQuery({
    queryKey: ['batch-checklist-progress', batchId, dayOfIncubation],
    queryFn: async () => {
      // Get today's applicable checklist items
      const { data: items, error: itemsError } = await supabase
        .from('daily_checklist_items')
        .select('*')
        .contains('applicable_days', [dayOfIncubation]);

      if (itemsError) throw itemsError;

      // Get today's completions for this batch
      const { data: completions, error: completionsError } = await supabase
        .from('checklist_completions')
        .select('checklist_item_id')
        .eq('batch_id', batchId)
        .eq('day_of_incubation', dayOfIncubation);

      if (completionsError) throw completionsError;

      const completedItemIds = new Set(completions?.map(c => c.checklist_item_id) || []);
      const requiredItems = items?.filter(item => item.is_required) || [];
      const completedRequired = requiredItems.filter(item => completedItemIds.has(item.id));

      return {
        totalItems: items?.length || 0,
        completedItems: completions?.length || 0,
        requiredItems: requiredItems.length,
        completedRequired: completedRequired.length,
        progressPercent: requiredItems.length > 0 ? 
          (completedRequired.length / requiredItems.length) * 100 : 100,
        isComplete: requiredItems.length > 0 ? 
          completedRequired.length === requiredItems.length : true,
        dayOfIncubation: dayOfIncubation
      };
    },
    enabled: !!batchId,
  });
};