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
  console.log('Starting lightweight document extraction...');
  
  try {
    // Handle text files directly
    if (base64File.startsWith('data:text/plain;base64,')) {
      const base64Data = base64File.split(',')[1];
      const fileContent = atob(base64Data);
      console.log('Processing plain text file, length:', fileContent.length);
      
      return {
        text: fileContent.trim() || 'No text content found in the file.',
        images: []
      };
    }
    
    // Handle binary files with lightweight extraction
    const base64Data = base64File.split(',')[1] || base64File;
    const binaryString = atob(base64Data);
    console.log('Processing document, size:', binaryString.length, 'bytes');
    
    // Lightweight .docx text extraction (without full ZIP parsing)
    let extractedText = '';
    
    // Look for .docx XML content patterns
    if (binaryString.includes('word/document.xml') || binaryString.includes('<w:t>')) {
      console.log('Detected .docx format - extracting text patterns');
      
      // Extract text between <w:t> tags (Word document text elements)
      const textMatches = binaryString.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (textMatches) {
        const textParts = textMatches.map(match => {
          return match.replace(/<[^>]+>/g, '').trim();
        }).filter(text => text.length > 0);
        
        extractedText = textParts.join(' ');
        console.log('Extracted from w:t tags, parts:', textParts.length);
      }
      
      // If no w:t tags found, try broader XML text extraction
      if (!extractedText) {
        const xmlText = binaryString.replace(/[^\x20-\x7E\s]/g, ' '); // Keep only printable ASCII
        const words = xmlText.match(/\b[a-zA-Z][a-zA-Z\s]{2,50}\b/g);
        if (words && words.length > 10) {
          extractedText = words.slice(0, 200).join(' ');
          console.log('Extracted from XML patterns, words:', words.length);
        }
      }
    }
    // Handle RTF files
    else if (binaryString.includes('\\rtf')) {
      console.log('Detected RTF format');
      extractedText = binaryString
        .replace(/\\[a-z]+\d*\s?/g, ' ') // Remove RTF control codes
        .replace(/[{}]/g, ' ') // Remove RTF braces
        .replace(/\s+/g, ' ')
        .trim();
    }
    // Fallback: extract readable ASCII text
    else {
      console.log('Using fallback text extraction');
      const readableText = [];
      let currentWord = '';
      
      for (let i = 0; i < Math.min(binaryString.length, 30000); i++) {
        const char = binaryString[i];
        const charCode = char.charCodeAt(0);
        
        if (charCode >= 32 && charCode <= 126) {
          currentWord += char;
        } else if (charCode === 10 || charCode === 13 || charCode === 9) {
          // Handle newlines and tabs as word separators
          if (currentWord.length >= 2 && /[a-zA-Z]/.test(currentWord)) {
            readableText.push(currentWord);
          }
          currentWord = '';
        } else {
          if (currentWord.length >= 2 && /[a-zA-Z]/.test(currentWord)) {
            readableText.push(currentWord);
          }
          currentWord = '';
        }
      }
      
      if (currentWord.length >= 2 && /[a-zA-Z]/.test(currentWord)) {
        readableText.push(currentWord);
      }
      
      const meaningfulWords = readableText.filter(word => {
        const clean = word.trim();
        return clean.length >= 2 && 
               clean.length <= 50 &&
               !/^[\d\s\-_.()]+$/.test(clean) &&
               /[a-zA-Z]/.test(clean);
      });
      
      extractedText = meaningfulWords.slice(0, 150).join(' ');
      console.log('Extracted meaningful words:', meaningfulWords.length);
    }
    
    // Clean up the final text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?()]/g, ' ') // Remove special characters
      .trim();
    
    if (extractedText.length < 10) {
      extractedText = 'Unable to extract readable text from this document. For best results, please save your Word document as a .txt file and upload it instead.';
    }
    
    console.log('Final text length:', extractedText.length);
    console.log('Text preview:', extractedText.substring(0, 100) + '...');
    
    // Note: Image extraction from .docx files requires full ZIP parsing which is too resource-intensive
    // For now, we'll focus on text extraction and suggest users include image descriptions in text
    return {
      text: extractedText,
      images: []
    };
    
  } catch (error) {
    console.error('Error in document extraction:', error);
    return {
      text: 'Document processing failed. Please save your Word document as a .txt file and try again.',
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