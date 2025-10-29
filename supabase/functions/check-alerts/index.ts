import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const alertsGenerated = [];

    // Check for temperature/humidity alerts from recent QA data
    console.log("Checking for temperature and humidity alerts...");
    const { data: qaData, error: qaError } = await supabase
      .from('qa_monitoring')
      .select(`
        *,
        batches (id, batch_number, status)
      `)
      .gte('check_date', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('check_date', { ascending: false });

    if (qaError) {
      console.error("Error fetching QA data:", qaError);
      throw qaError;
    }

    // Check each QA reading against thresholds
    for (const qa of qaData || []) {
      const existingTempAlert = await supabase
        .from('alerts')
        .select('id')
        .eq('batch_id', qa.batch_id)
        .eq('alert_type', 'temperature')
        .eq('status', 'active')
        .gte('triggered_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      const existingHumidityAlert = await supabase
        .from('alerts')
        .select('id')
        .eq('batch_id', qa.batch_id)
        .eq('alert_type', 'humidity')
        .eq('status', 'active')
        .gte('triggered_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      // Temperature check
      if ((qa.temperature < 99 || qa.temperature > 101) && !existingTempAlert.data?.length) {
        const severity = qa.temperature < 97 || qa.temperature > 103 ? 'critical' : 'warning';
        const alert = {
          alert_type: 'temperature',
          batch_id: qa.batch_id,
          severity,
          title: `Temperature Alert - ${qa.batches?.batch_number}`,
          message: `Temperature reading of ${qa.temperature}°F is outside optimal range (99-101°F)`,
          current_temperature: qa.temperature,
          batch_day: qa.day_of_incubation,
          status: 'active'
        };

        const { error: insertError } = await supabase
          .from('alerts')
          .insert(alert);

        if (!insertError) {
          alertsGenerated.push(alert);
          console.log(`Generated temperature alert for batch ${qa.batches?.batch_number}`);
        }
      }

      // Humidity check
      if ((qa.humidity < 55 || qa.humidity > 65) && !existingHumidityAlert.data?.length) {
        const severity = qa.humidity < 45 || qa.humidity > 75 ? 'critical' : 'warning';
        const alert = {
          alert_type: 'humidity',
          batch_id: qa.batch_id,
          severity,
          title: `Humidity Alert - ${qa.batches?.batch_number}`,
          message: `Humidity reading of ${qa.humidity}% is outside optimal range (55-65%)`,
          current_humidity: qa.humidity,
          batch_day: qa.day_of_incubation,
          status: 'active'
        };

        const { error: insertError } = await supabase
          .from('alerts')
          .insert(alert);

        if (!insertError) {
          alertsGenerated.push(alert);
          console.log(`Generated humidity alert for batch ${qa.batches?.batch_number}`);
        }
      }
    }

    // Check for critical day alerts
    console.log("Checking for critical day alerts...");
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .in('status', ['setting', 'incubating', 'hatching']);

    if (batchError) {
      console.error("Error fetching batches:", batchError);
      throw batchError;
    }

    for (const batch of batches || []) {
      const daysSinceSet = Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24));
      
      // Check for critical days (7, 14, 18, 21)
      if ([7, 14, 18, 21].includes(daysSinceSet)) {
        // Check if alert already exists for this batch and day
        const existingAlert = await supabase
          .from('alerts')
          .select('id')
          .eq('batch_id', batch.id)
          .eq('alert_type', 'critical_day')
          .eq('batch_day', daysSinceSet)
          .eq('status', 'active');

        if (!existingAlert.data?.length) {
          const alert = {
            alert_type: 'critical_day',
            batch_id: batch.id,
            severity: 'info',
            title: `Critical Day ${daysSinceSet} - ${batch.batch_number}`,
            message: `Batch ${batch.batch_number} has reached day ${daysSinceSet} - special attention required`,
            batch_day: daysSinceSet,
            status: 'active'
          };

          const { error: insertError } = await supabase
            .from('alerts')
            .insert(alert);

          if (!insertError) {
            alertsGenerated.push(alert);
            console.log(`Generated critical day alert for batch ${batch.batch_number} - Day ${daysSinceSet}`);
          }
        }
      }
    }

    // Check for incomplete checklists
    console.log("Checking for incomplete checklists...");
    
    for (const batch of batches || []) {
      const daysSinceSet = Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24));
      
      // Get today's required checklist items for this day
      const { data: checklistItems, error: checklistError } = await supabase
        .from('daily_checklist_items')
        .select('*')
        .contains('applicable_days', [daysSinceSet])
        .eq('is_required', true);

      if (checklistError) {
        console.error("Error fetching checklist items:", checklistError);
        continue;
      }

      if (checklistItems && checklistItems.length > 0) {
        // Get today's completions for this batch
        const { data: completions, error: completionsError } = await supabase
          .from('checklist_completions')
          .select('checklist_item_id')
          .eq('batch_id', batch.id)
          .eq('day_of_incubation', daysSinceSet);

        if (completionsError) {
          console.error("Error fetching completions:", completionsError);
          continue;
        }

        const completedItemIds = new Set(completions?.map(c => c.checklist_item_id) || []);
        const incompleteItems = checklistItems.filter(item => !completedItemIds.has(item.id));

        if (incompleteItems.length > 0) {
          // Check if alert already exists
          const existingAlert = await supabase
            .from('alerts')
            .select('id')
            .eq('batch_id', batch.id)
            .eq('alert_type', 'checklist_incomplete')
            .eq('batch_day', daysSinceSet)
            .eq('status', 'active');

          if (!existingAlert.data?.length) {
            const alert = {
              alert_type: 'checklist_incomplete',
              batch_id: batch.id,
              severity: incompleteItems.length >= 3 ? 'critical' : 'warning',
              title: `Incomplete Checklist - ${batch.batch_number}`,
              message: `${incompleteItems.length} required checklist items incomplete for Day ${daysSinceSet}`,
              batch_day: daysSinceSet,
              status: 'active'
            };

            const { error: insertError } = await supabase
              .from('alerts')
              .insert(alert);

            if (!insertError) {
              alertsGenerated.push(alert);
              console.log(`Generated checklist incomplete alert for batch ${batch.batch_number} - Day ${daysSinceSet}`);
            }
          }
        }
      }
    }

    // Check for machine maintenance alerts
    console.log("Checking for machine maintenance alerts...");
    const { data: machines, error: machineError } = await supabase
      .from('machines')
      .select('*');

    if (machineError) {
      console.error("Error fetching machines:", machineError);
      throw machineError;
    }

    for (const machine of machines || []) {
      if (machine.last_maintenance) {
        const daysSinceLastMaintenance = Math.floor((new Date().getTime() - new Date(machine.last_maintenance).getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if maintenance is overdue (30+ days)
        if (daysSinceLastMaintenance >= 30) {
          const existingAlert = await supabase
            .from('alerts')
            .select('id')
            .eq('machine_id', machine.id)
            .eq('alert_type', 'machine_maintenance')
            .eq('status', 'active');

          if (!existingAlert.data?.length) {
            const alert = {
              alert_type: 'machine_maintenance',
              machine_id: machine.id,
              severity: daysSinceLastMaintenance >= 45 ? 'critical' : 'warning',
              title: `Maintenance Overdue - ${machine.machine_number}`,
              message: `Machine ${machine.machine_number} maintenance is overdue by ${daysSinceLastMaintenance - 30} days`,
              status: 'active'
            };

            const { error: insertError } = await supabase
              .from('alerts')
              .insert(alert);

            if (!insertError) {
              alertsGenerated.push(alert);
              console.log(`Generated maintenance alert for machine ${machine.machine_number}`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsGenerated: alertsGenerated.length,
        alerts: alertsGenerated
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    );

  } catch (error) {
    console.error("Error in check-alerts function:", error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    );
  }
});