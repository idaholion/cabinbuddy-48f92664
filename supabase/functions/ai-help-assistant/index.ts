import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HELP_CONTENT = {
  "/": "Main dashboard for cabin management and reservations",
  "/cabin-calendar": "View and manage cabin reservations by date",
  "/reservation-setup": "Configure reservation periods and settings",
  "/family-setup": "Manage family groups and member assignments", 
  "/finance-reports": "Track expenses, payments, and financial reporting",
  "/work-weekends": "Schedule and manage work weekend activities",
  "/documents": "Access cabin rules, seasonal docs, and shared files",
  "/photos": "Share and view photos from cabin stays",
  "/messaging": "Communication between family groups",
  "/checkin": "Daily check-in process and checklists"
};

const COMMON_ISSUES = {
  "reservation": "For reservation issues: Check rotation order, verify dates don't conflict, ensure family group has permission",
  "payment": "For payment issues: Verify payment settings, check due dates, ensure proper billing setup",
  "access": "For access issues: Confirm organization membership, check user permissions, verify family group assignment",
  "calendar": "For calendar issues: Refresh the page, check reservation periods are configured, verify dates are within allowed range"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context-aware prompt
    const currentPage = context?.route || "/";
    const userRole = context?.userRole || "member";
    const pageContext = HELP_CONTENT[currentPage] || "General cabin management";
    
    const systemPrompt = `You are a helpful assistant for a cabin management application. 

CONTEXT:
- Current page: ${currentPage} - ${pageContext}
- User role: ${userRole}
- Common issues: ${Object.entries(COMMON_ISSUES).map(([key, value]) => `${key}: ${value}`).join('\n')}

GUIDELINES:
- Be concise and actionable
- Reference specific UI elements when relevant
- Suggest step-by-step solutions
- If the issue seems complex, recommend contacting an admin
- Focus on the current page context when relevant
- Use friendly, helpful tone

USER MESSAGE: ${message}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    console.log('AI Help Request:', { message, context, response: aiResponse });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-help-assistant:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get AI assistance',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});