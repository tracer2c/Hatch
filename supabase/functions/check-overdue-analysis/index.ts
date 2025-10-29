import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleRecord {
  id: string;
  batch_id: string;
  scheduled_date: string;
  due_date: string;
  status: string;
  batch: {
    batch_number: string;
    flock: {
      flock_name: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Checking for overdue analyses on ${today}`);

    // Get all pending schedules that are past due
    const { data: overdueSchedules, error: fetchError } = await supabase
      .from('residue_analysis_schedule')
      .select(`
        *,
        batch:batches(
          batch_number,
          flock:flocks(flock_name)
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', today);

    if (fetchError) {
      console.error('Error fetching overdue schedules:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${overdueSchedules?.length || 0} overdue schedules`);

    if (!overdueSchedules || overdueSchedules.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No overdue analyses found',
          processed: 0 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Update status to overdue
    const overdueIds = overdueSchedules.map(schedule => schedule.id);
    const { error: updateError } = await supabase
      .from('residue_analysis_schedule')
      .update({ status: 'overdue' })
      .in('id', overdueIds);

    if (updateError) {
      console.error('Error updating overdue schedules:', updateError);
      throw updateError;
    }

    // Create alerts for each overdue analysis
    const alerts = overdueSchedules.map((schedule: ScheduleRecord) => ({
      alert_type: 'schedule_reminder',
      batch_id: schedule.batch_id,
      severity: 'high',
      status: 'active',
      title: 'Overdue Residue Analysis',
      message: `Residue analysis for batch ${schedule.batch.batch_number} (${schedule.batch.flock.flock_name}) is overdue. Due date was ${schedule.due_date}.`
    }));

    if (alerts.length > 0) {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert(alerts);

      if (alertError) {
        console.error('Error creating alerts:', alertError);
        // Don't throw here, just log the error
      } else {
        console.log(`Created ${alerts.length} overdue analysis alerts`);
      }
    }

    console.log(`Successfully processed ${overdueSchedules.length} overdue analyses`);

    return new Response(
      JSON.stringify({
        message: 'Overdue analysis check completed',
        processed: overdueSchedules.length,
        alerts_created: alerts.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in check-overdue-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to check overdue analyses'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);