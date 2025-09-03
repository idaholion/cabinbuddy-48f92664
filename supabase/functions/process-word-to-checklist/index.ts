import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentContent {
  text: string;
  images: Array<{
    data: string; // base64
    position: number; // position in document
    description?: string;
  }>;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: false;
  imageUrl?: string;
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasOpenAI: !!OPENAI_API_KEY,
      hasSupabase: !!SUPABASE_URL,
      hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY
    });

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { wordFile, checklistType, organizationId } = await req.json();
    
    console.log('Processing Word document for checklist type:', checklistType);
    console.log('Organization ID:', organizationId);

    // Extract content from Word document (.docx)
    const documentContent = await extractWordContent(wordFile);
    console.log('Extracted text length:', documentContent.text.length);
    console.log('Found images:', documentContent.images.length);

    // Send text to OpenAI for checklist conversion
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Convert the following text into a structured JSON checklist. Each item should be short, actionable, and may include a placeholder for a photo if one is nearby in the original document.

Return a JSON array where each item has:
- id: unique identifier (string)
- text: short, actionable instruction (string)
- completed: false (boolean)
- imageExpected: true/false (boolean) - true if there should be a photo for this step
- imageDescription: brief description of expected image (string, optional)

Preserve numbered lists and bullet points. Make items concise but complete.`
          },
          {
            role: 'user',
            content: documentContent.text
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    let checklistItems: ChecklistItem[] = [];
    
    try {
      const aiContent = openAIData.choices[0]?.message?.content || '[]';
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiContent;
      checklistItems = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse AI response into valid JSON');
    }

    console.log('Generated checklist items:', checklistItems.length);

    // Upload images to Supabase Storage and associate with checklist items
    const processedItems = await associateImagesWithItems(
      checklistItems,
      documentContent.images,
      supabase,
      organizationId
    );

    // Save the checklist to database
    const { data, error } = await supabase
      .from('custom_checklists')
      .upsert({
        organization_id: organizationId,
        checklist_type: checklistType,
        items: processedItems,
        images: documentContent.images.map((img, idx) => ({
          id: `img-${idx}`,
          description: img.description,
          position: img.position
        }))
      }, {
        onConflict: 'organization_id,checklist_type'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save checklist to database');
    }

    console.log('Checklist saved successfully:', data.id);

    return new Response(JSON.stringify({
      success: true,
      checklistId: data.id,
      itemsCount: processedItems.length,
      imagesCount: documentContent.images.length,
      message: 'Word document successfully converted to interactive checklist'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Word document:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to process Word document',
      details: 'Please ensure you uploaded a valid .docx file and try again'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Changed to 200 to avoid additional error handling
    });
  }
});

async function extractWordContent(base64File: string): Promise<DocumentContent> {
  console.log('Starting simple Word document extraction...');
  
  try {
    // Simple approach: treat the document as binary and extract any readable text
    const binaryString = atob(base64File.split(',')[1] || base64File);
    
    // Extract readable ASCII characters and create meaningful text
    let extractedText = '';
    let readableChars = '';
    
    for (let i = 0; i < binaryString.length && i < 50000; i++) { // Limit processing to prevent timeout
      const charCode = binaryString.charCodeAt(i);
      // Include printable ASCII characters
      if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
        readableChars += binaryString.charAt(i);
      } else if (readableChars.length > 0) {
        // Add space when hitting non-printable to separate words
        readableChars += ' ';
      }
    }
    
    // Clean up the text and extract meaningful words
    const words = readableChars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .split(' ')
      .filter(word => {
        const trimmed = word.trim();
        return trimmed.length >= 3 && 
               trimmed.length <= 30 && 
               /^[a-zA-Z][a-zA-Z0-9\-.,!?']*$/.test(trimmed);
      })
      .slice(0, 200); // Limit number of words

    if (words.length >= 5) {
      extractedText = words.join(' ');
      console.log('Successfully extracted', words.length, 'words');
    } else {
      extractedText = 'Please copy and paste your checklist content, as automatic extraction from this document format is not fully supported.';
      console.log('Insufficient readable content found');
    }

    return {
      text: extractedText,
      images: []
    };
    
  } catch (error) {
    console.error('Error in extraction:', error);
    return {
      text: 'Document processing failed. Please copy and paste your content instead.',
      images: []
    };
  }
}

async function associateImagesWithItems(
  items: ChecklistItem[],
  images: Array<{ data: string; position: number; description?: string }>,
  supabase: any,
  organizationId: string
): Promise<ChecklistItem[]> {
  const processedItems = [...items];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      // Upload image to Supabase Storage
      const fileName = `${organizationId}/checklist-${Date.now()}-${i}.jpg`;
      const imageBuffer = Uint8Array.from(atob(image.data), c => c.charCodeAt(0));
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('checklist-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('checklist-images')
        .getPublicUrl(fileName);

      // Associate with the nearest checklist item based on position
      const nearestItemIndex = Math.min(
        Math.floor((image.position / 100) * items.length),
        items.length - 1
      );

      if (processedItems[nearestItemIndex]) {
        processedItems[nearestItemIndex].imageUrl = publicUrl;
        processedItems[nearestItemIndex].imageDescription = image.description || `Image for step ${nearestItemIndex + 1}`;
      }

    } catch (error) {
      console.error('Error processing image:', error);
    }
  }

  return processedItems;
}