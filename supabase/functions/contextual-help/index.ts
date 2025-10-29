import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const hatcheryKnowledge = `
You are a conversational assistant for a hatchery management system. Your goal is to be helpful, concise, and interactive.

CONVERSATION STYLE:
- Keep responses SHORT and focused (2-3 sentences max)
- When users ask vague questions, ask targeted follow-up questions
- Avoid information dumping - be conversational
- Ask specific questions to understand what they need help with
- Provide numbered options when appropriate (these will become clickable buttons)
- Format numbered lists as: "1. Option one 2. Option two 3. Option three"

HATCHERY DOMAIN KNOWLEDGE:
- Incubation Process: Eggs are set in incubators, go through various stages (setting, candling, transfer, hatch), and result in chicks
- Key Metrics: Hatch rate, fertility rate, early/late mortality, first grade chicks, culls, etc.
- Data Types: Egg pack data, fertility data, QA measurements, residue analysis, environmental conditions
- Process Flow: Setting → Incubation → Candling → Transfer → Hatching → Chick Processing
- Units/Houses: Physical locations where batches are processed
- Batches: Groups of eggs processed together with tracking numbers
- Breeds: Different chicken breeds with varying performance characteristics
- SOPs: Standard Operating Procedures for consistent operations

APPLICATION FEATURES:
- Dashboard: Overview of operations, alerts, and key metrics
- Smart Analytics: AI-powered insights and interactive charts
- Process Flow: Visual workflow of hatchery operations
- Advanced Analytics: Detailed comparison tools and specialized analysis
- Data Entry: Input interfaces for various operational data
- Daily Checklist: Routine task management
- Management: User and system configuration
- Reports: Comprehensive documentation and analysis

DASHBOARD OVERVIEW PAGE ELEMENTS:
- Active House Pipeline: Shows houses with their current batches and stages
- Performance Percentages: Key metrics like hatch rates, fertility rates
- QA Alerts: Quality assurance notifications and warnings
- System Status: Overall operational status indicators
- Recent Activity: Latest actions and updates

CONVERSATION RULES:
- If user asks "what am I looking at" or similar vague questions, ask which specific part they're interested in
- Use numbered lists for options
- Keep explanations brief and ask if they want more detail
- Don't repeat the same follow-up questions in a conversation
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, pageContext, pageDescription, currentPath, uiContext, history } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Contextual help request:', {
      message,
      pageContext,
      currentPath,
      uiContext: uiContext || 'none'
    });

    // Detect if this is a vague question that needs follow-up
    const isVagueQuestion = /what am i (looking at|seeing)|what is this|i don't know|what does this mean|help me understand/i.test(message);
    const hasRecentHistory = history && history.length > 0;
    const lastMessage = hasRecentHistory ? history[history.length - 1] : null;
    const alreadyAskedWhichPart = lastMessage && /which (part|specific|section)|interested in/i.test(lastMessage.content);
    
    let systemPrompt = `${hatcheryKnowledge}

CURRENT CONTEXT:
- Page: ${pageContext}
- Description: ${pageDescription}
- Path: ${currentPath}
${uiContext ? `
- Active Tab: ${uiContext.activeTab || 'None'}
- Visible Elements: ${uiContext.visibleElements?.join(', ') || 'None'}
- Current Metrics: ${JSON.stringify(uiContext.currentMetrics || {})}
- Selected Filters: ${JSON.stringify(uiContext.selectedFilters || {})}` : ''}

The user is currently viewing the "${pageContext}" page. ${pageDescription}${uiContext?.activeTab ? ` They are on the "${uiContext.activeTab}" tab.` : ''}

RESPONSE RULES:
- Keep responses to 1-2 sentences maximum
- If currentMetrics exist, start by mentioning the most relevant metric briefly
- Ask at most 1 follow-up question using numbered options
- If we already asked "which part" in recent history, answer directly instead of asking again`;

    if (isVagueQuestion && !alreadyAskedWhichPart && !uiContext?.activeTab) {
      if (pageContext === "Dashboard Overview") {
        systemPrompt += `

SPECIAL INSTRUCTION: Ask which specific part they're interested in using this exact format:
"What would you like to know about? 1. Active House Pipeline 2. Performance percentages 3. QA Alerts 4. System status"

Keep response to 1 sentence plus numbered options.`;
      } else if (pageContext === "Comparison Model") {
        systemPrompt += `

SPECIAL INSTRUCTION: Ask which comparison type they want help with using this exact format:
"Which comparison would you like help with? 1. Flocks 2. Houses 3. Units 4. Breeds 5. Trends"

Keep response to 1 sentence plus numbered options.`;
      }
    } else if (alreadyAskedWhichPart && isVagueQuestion) {
      systemPrompt += `

SPECIAL INSTRUCTION: We already asked which part they're interested in. Answer directly about the most visible/important element on the page. Don't ask again.`;
    } else {
      systemPrompt += `

${uiContext?.activeTab ? `Focus on explaining the "${uiContext.activeTab}" tab they're viewing.` : ''} 
Provide specific, helpful responses about what they're seeing.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0]?.message?.content;

    if (!assistantResponse) {
      throw new Error('No response from OpenAI');
    }

    console.log('Generated response for contextual help');

    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in contextual-help function:', error);
    
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});