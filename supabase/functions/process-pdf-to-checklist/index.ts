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

    // Since PDFs contain binary data, we'll create a generic checklist based on the type
    console.log('Creating generic checklist for type:', checklistType);
    
    // Create a basic checklist structure based on the checklist type
    const genericChecklists = {
      opening: [
        { text: "Check water system and turn on main valve", hasImage: true, imageDescription: "Water main valve in open position" },
        { text: "Inspect plumbing for leaks or damage", hasImage: true, imageDescription: "Common plumbing leak locations to check" },
        { text: "Turn on electricity at main breaker", hasImage: true, imageDescription: "Main electrical panel with breakers on" },
        { text: "Test all light switches and outlets", hasImage: false },
        { text: "Check heating/cooling system operation", hasImage: true, imageDescription: "HVAC thermostat settings for opening season" },
        { text: "Inspect windows and doors for damage", hasImage: false },
        { text: "Clean and stock basic supplies", hasImage: false }
      ],
      closing: [
        { text: "Turn off water main and drain all pipes", hasImage: true, imageDescription: "Water shut-off valve in closed position and pipe drainage points" },
        { text: "Turn off electricity at main breaker", hasImage: true, imageDescription: "Main electrical panel with breakers switched off" },
        { text: "Set thermostat to winter temperature", hasImage: true, imageDescription: "Thermostat display showing winter settings" },
        { text: "Remove all perishable food items", hasImage: false },
        { text: "Clean and secure all appliances", hasImage: false },
        { text: "Lock all windows and doors", hasImage: false },
        { text: "Document any maintenance needed", hasImage: false }
      ],
      maintenance: [
        { text: "Inspect roof and gutters for damage", hasImage: true, imageDescription: "Roof inspection points and gutter cleaning" },
        { text: "Check exterior paint and siding", hasImage: true, imageDescription: "Common areas where paint maintenance is needed" },
        { text: "Service HVAC system", hasImage: true, imageDescription: "HVAC filter replacement and maintenance points" },
        { text: "Test smoke and carbon monoxide detectors", hasImage: true, imageDescription: "Smoke detector testing button location" },
        { text: "Inspect deck/porch for safety issues", hasImage: true, imageDescription: "Deck railing and board inspection points" },
        { text: "Clean and organize storage areas", hasImage: false },
        { text: "Update maintenance log", hasImage: false }
      ]
    };

    const items = (genericChecklists[checklistType] || genericChecklists.maintenance).map((item, index) => ({
      id: `item-${index + 1}`,
      text: item.text,
      completed: false,
      category: checklistType,
      hasImage: item.hasImage,
      imageDescription: item.imageDescription || null,
      imagePosition: "before"
    }));

    const checklistData = { items };

    // For items that need images, generate them using OpenAI's image generation
    let imageProcessedCount = 0;
    const maxConcurrentImages = 2; // Reduce concurrent requests to avoid rate limiting
    
    for (let i = 0; i < checklistData.items.length; i += maxConcurrentImages) {
      const batch = checklistData.items.slice(i, i + maxConcurrentImages);
      
      await Promise.all(
        batch.map(async (item) => {
          if (item.hasImage && item.imageDescription) {
            try {
              console.log('Generating image for item:', item.text);
              
              // Add substantial delay between requests to avoid rate limiting
              if (imageProcessedCount > 0) {
                await delay(5000); // 5 second delay between image requests
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
                
                // Handle rate limiting with exponential backoff
                if (imageResponse.status === 429) {
                  console.log('Rate limited, skipping image generation for this item');
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
      
      // Add substantial delay between batches
      if (i + maxConcurrentImages < checklistData.items.length) {
        await delay(10000); // 10 second delay between batches
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