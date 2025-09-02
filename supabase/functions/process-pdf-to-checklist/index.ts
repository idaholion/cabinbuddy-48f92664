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

    // Use OpenAI to extract and structure the PDF content
    console.log('Extracting content from PDF using OpenAI...');
    
    const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using vision model to handle PDF
        messages: [
          {
            role: 'system',
            content: `You are a PDF content extractor. Extract ALL bullet points, numbered items, and checklist items from the provided PDF. 
            
            Return ONLY a JSON object with this exact structure:
            {
              "items": [
                {
                  "text": "exact text of the bullet point or item",
                  "hasImage": false
                }
              ]
            }
            
            IMPORTANT:
            - Extract EVERY bullet point, dash, number, or checklist item
            - Keep the original text exactly as written
            - If you see 46 items, return all 46 items
            - Set hasImage to true if there appears to be an image or figure near the item
            - Do not summarize or modify the text
            - Do not add your own items`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all bullet points and checklist items from this PDF document. I need every single item preserved exactly as written.'
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