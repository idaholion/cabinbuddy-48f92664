import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Convert PDF to text first (OpenAI vision doesn't support PDFs directly)
    console.log('Converting PDF to text using OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an AI that converts text content into structured checklists with image descriptions.
            
            Based on the provided text, create actionable checklist items. For each item where a visual aid would be helpful, describe what type of image would enhance understanding.
            
            Return a JSON response with this structure:
            {
              "items": [
                {
                  "id": "item-1",
                  "text": "Checklist item text",
                  "completed": false,
                  "category": "${checklistType}",
                  "hasImage": true/false,
                  "imageDescription": "Detailed description of what the image should show",
                  "imagePosition": "before|after"
                }
              ]
            }
            
            Focus on actionable items that would make sense in a ${checklistType} checklist.`
          },
          {
            role: 'user',
            content: `Please convert this document content into a ${checklistType} checklist with associated image descriptions where relevant:\n\n${Buffer.from(pdfFile, 'base64').toString('utf8').substring(0, 10000)}`
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the AI response
    let checklistData;
    try {
      // Extract JSON from response if it's wrapped in markdown
      const jsonMatch = aiResponse.match(/```(?:json)?\n?(.*?)\n?```/s);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      checklistData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse checklist data from AI response');
    }

    // For items that need images, generate them using OpenAI's image generation
    let imageProcessedCount = 0;
    const maxConcurrentImages = 3; // Limit concurrent requests
    
    for (let i = 0; i < checklistData.items.length; i += maxConcurrentImages) {
      const batch = checklistData.items.slice(i, i + maxConcurrentImages);
      
      await Promise.all(
        batch.map(async (item) => {
          if (item.hasImage && item.imageDescription) {
            try {
              console.log('Generating image for item:', item.text);
              
              // Add delay between requests to avoid rate limiting
              if (imageProcessedCount > 0) {
                await delay(2000); // 2 second delay between image requests
              }
              
              const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-image-1',
                  prompt: `${item.imageDescription}. Make it clear, instructional, and suitable for a ${checklistType} checklist. High quality, professional style.`,
                  n: 1,
                  size: '1024x1024',
                  quality: 'high',
                  output_format: 'png'
                }),
              });

              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                const imageBase64 = imageData.data[0].b64_json;
                
                // Upload image to Supabase storage
                const fileName = `${organizationId}/${checklistType}/${item.id}.png`;
                const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
                
                const { error: uploadError } = await supabase.storage
                  .from('checklist-images')
                  .upload(fileName, imageBuffer, {
                    contentType: 'image/png',
                    upsert: true
                  });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('checklist-images')
                    .getPublicUrl(fileName);
                  
                  item.imageUrl = publicUrl;
                  console.log('Image uploaded successfully:', publicUrl);
                } else {
                  console.error('Failed to upload image:', uploadError);
                  item.hasImage = false;
                }
              } else {
                const errorText = await imageResponse.text();
                console.error('Failed to generate image:', errorText);
                
                // Handle rate limiting
                if (imageResponse.status === 429) {
                  console.log('Rate limited, waiting longer before retry...');
                  await delay(10000); // 10 second delay for rate limiting
                }
                item.hasImage = false;
              }
              
              imageProcessedCount++;
            } catch (imageError) {
              console.error('Error processing image for item:', item.text, imageError);
              item.hasImage = false;
            }
          }
        })
      );
      
      // Add delay between batches
      if (i + maxConcurrentImages < checklistData.items.length) {
        await delay(3000); // 3 second delay between batches
      }
    }

    console.log('Successfully processed PDF into checklist with', checklistData.items.length, 'items');

    return new Response(JSON.stringify({
      success: true,
      checklist: checklistData
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