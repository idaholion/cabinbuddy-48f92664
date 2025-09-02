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

    // Convert base64 PDF to text and extract images using OpenAI GPT-4V
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an AI that converts PDF documents into structured checklists with images. 
            
            Extract the text content and identify any visual elements (diagrams, photos, illustrations) that would be helpful for checklist items.
            
            Return a JSON response with this structure:
            {
              "items": [
                {
                  "id": "unique-id",
                  "text": "Checklist item text",
                  "completed": false,
                  "category": "${checklistType}",
                  "hasImage": true/false,
                  "imageDescription": "Description of what the image shows",
                  "imagePosition": "before|after" // Whether image should appear before or after the text
                }
              ]
            }
            
            Focus on actionable items that would make sense in a ${checklistType} checklist.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please convert this PDF document into a ${checklistType} checklist with associated images where relevant.`
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
        max_tokens: 2000,
        temperature: 0.3,
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
    for (const item of checklistData.items) {
      if (item.hasImage && item.imageDescription) {
        try {
          console.log('Generating image for item:', item.text);
          
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
            
            const { data: uploadData, error: uploadError } = await supabase.storage
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
            console.error('Failed to generate image:', await imageResponse.text());
            item.hasImage = false;
          }
        } catch (imageError) {
          console.error('Error processing image for item:', item.text, imageError);
          item.hasImage = false;
        }
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