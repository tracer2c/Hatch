import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  units: string[];
  weekStart: string; // YYYY-MM-DD
  metrics: string[];
  history: Array<{
    unit_id: string;
    week_start: string;
    metrics: Record<string, number | null>;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Payload;

    const systemPrompt = `You are an AI assistant for a poultry hatchery analytics platform. You forecast weekly metrics for selected units using up to 12 weeks of historical data provided. 
- Metrics include: eggs_set, fertility_percent, hatch_percent, residue_percent, temperature_avg, humidity_avg.
- Provide realistic, conservative predictions (avoid extreme jumps). 
- Consider trends, seasonality, and correlations (e.g., high temp might reduce hatch%).
Return STRICT JSON with keys: { predictions: { [unitId]: { [metric]: number|null } }, insights: string[] }. Only output JSON.`;

    const userPrompt = {
      role: "user",
      content: [
        {
          type: "text",
          text: `Selected units: ${body.units.join(", ")}\nTarget week start: ${body.weekStart}\nMetrics: ${body.metrics.join(", ")}\n\nHistory JSON (array of weekly points):\n${JSON.stringify(body.history)}`,
        },
      ],
    } as const;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          userPrompt,
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error", err);
      return new Response(JSON.stringify({ error: "OpenAI error", details: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "{}";

    // Try to parse JSON (strip code fences if any)
    const jsonText = text.replace(/^```json\n?|```$/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(jsonText); } catch (_) { parsed = {}; }

    const result = {
      predictions: parsed.predictions || {},
      insights: parsed.insights || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("predict-metrics error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
