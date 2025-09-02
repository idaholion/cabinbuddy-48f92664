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

    // Try to extract text from PDF using OpenAI's newer capabilities
    console.log('Processing PDF with OpenAI...');
    
    const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a document content extractor. Extract ALL text content from the provided document and identify any checklist items, bullet points, numbered lists, or task items.
            
            Return ONLY a JSON object with this exact structure:
            {
              "items": [
                {
                  "text": "exact text of each item",
                  "hasImage": false
                }
              ]
            }
            
            IMPORTANT:
            - Extract EVERY identifiable task, item, or instruction
            - Keep the original text exactly as written
            - Remove only bullet symbols (•, -, *, numbers) from the beginning
            - If no clear list items exist, break content into logical task-based chunks
            - Do not add your own interpretation or items`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all checklist items and tasks from this document.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfFile}`
                }
              }
            ]
          }
        ],
        max_completion_tokens: 8000
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('OpenAI extraction failed:', errorText);
      throw new Error(`Failed to extract PDF content: ${errorText}`);
    }

    const extractionData = await extractionResponse.json();
    console.log('OpenAI extraction response:', extractionData);
    
    const extractedContent = extractionData.choices[0].message.content;
    console.log('Extracted content:', extractedContent);

    // Parse the JSON response
    let parsedContent;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = JSON.parse(extractedContent);
      }
    } catch (parseError) {
      console.error('Failed to parse extracted content as JSON:', parseError);
      console.log('Raw content:', extractedContent);
      
      // Fallback: try to extract bullet points manually from the text
      const lines = extractedContent.split('\n');
      const bulletPoints = lines
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && (
            trimmed.startsWith('•') || 
            trimmed.startsWith('-') || 
            trimmed.startsWith('*') ||
            /^\d+\./.test(trimmed) ||
            trimmed.startsWith('□') ||
            trimmed.startsWith('☐')
          );
        })
        .map((line, index) => ({
          text: line.trim().replace(/^[•\-*\d+\.\□☐]\s*/, ''),
          hasImage: false
        }));

      parsedContent = { items: bulletPoints };
    }

    if (!parsedContent.items || !Array.isArray(parsedContent.items)) {
      throw new Error('Invalid content structure extracted from PDF');
    }

    console.log(`Successfully extracted ${parsedContent.items.length} items from PDF`);

    // Process the extracted items and add IDs
    const processedItems = parsedContent.items.map((item, index) => ({
      id: `item-${index + 1}`,
      text: item.text || '',
      completed: false,
      hasImage: item.hasImage || false,
      imagePosition: 'after'
    }));

    const checklistData = { items: processedItems };

    console.log('Successfully processed PDF into checklist with', checklistData.items.length, 'items');

    return new Response(JSON.stringify({
      success: true,
      checklist: checklistData,
      extractedCount: processedItems.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-pdf-to-checklist:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to process PDF',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});