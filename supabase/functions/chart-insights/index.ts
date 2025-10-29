import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { chartType, data, chartConfig } = await req.json();

    // Create a context-aware prompt based on chart type
    const contextualPrompt = generatePromptForChart(chartType, data, chartConfig);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a hatchery operations expert helping non-technical users understand their data visualizations. Provide clear, actionable insights in 2-3 sentences. Focus on what the data means for their operations and what actions they might consider.'
          },
          {
            role: 'user',
            content: contextualPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const aiResponse = await response.json();
    const explanation = aiResponse.choices[0].message.content;

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chart-insights function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generatePromptForChart(chartType: string, data: any, config: any): string {
  switch (chartType) {
    case 'process-flow':
      return `Analyze this hatchery process flow data: ${JSON.stringify(data)}. The chart shows fertility and hatch rates over time. Explain what this trend means for hatchery operations and what actions might be needed.`;
    
    case 'correlation':
      return `Analyze this quality vs fertility correlation data: ${JSON.stringify(data)}. Explain the relationship between egg quality scores and fertility rates, and what this means for the hatchery's breeding program.`;
    
    case 'age-performance':
      return `Analyze this flock age performance data: ${JSON.stringify(data)}. The chart shows how fertility and hatch rates vary by flock age in weeks. Explain the optimal breeding age ranges and any concerns.`;
    
    case 'breed-performance':
      return `Analyze this breed performance comparison: ${JSON.stringify(data)}. Compare fertility, hatch rates, and quality scores across different breeds. Highlight which breeds are performing best.`;
    
    case 'performance-trends':
      return `Analyze these performance trends: ${JSON.stringify(data)}. Explain the patterns in fertility, hatch rates, and quality scores over time and what they indicate about operational efficiency.`;
    
    case 'batch-overview':
      return `Analyze this batch overview data: ${JSON.stringify(data)}. Explain what the current metrics (active batches, fertility rates, alerts) indicate about overall hatchery performance.`;
    
    default:
      return `Analyze this hatchery data visualization: ${JSON.stringify(data)}. Explain what the data shows and what it means for hatchery operations in simple terms.`;
  }
}