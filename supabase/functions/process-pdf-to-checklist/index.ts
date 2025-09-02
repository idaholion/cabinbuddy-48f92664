import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { pdfFile, checklistType, organizationId } = await req.json();
    
    console.log('Processing PDF for checklist type:', checklistType);
    console.log('PDF file size:', pdfFile.length);

    // Note: Direct PDF processing with OpenAI requires proper PDF parsing
    // For now, we'll provide a clear message about the limitation
    console.log('PDF processing requested...');
    
    return new Response(JSON.stringify({
      success: false,
      error: 'PDF Processing Not Available',
      details: 'Direct PDF processing is not currently supported. Please copy and paste the text content from your PDF into the text converter instead.',
      suggestion: 'Use the "Text" option in the converter and paste your checklist items directly.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-pdf-to-checklist:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'PDF Processing Not Available',
      details: 'Direct PDF processing is not currently supported. Please copy and paste the text content from your PDF into the text converter instead.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});