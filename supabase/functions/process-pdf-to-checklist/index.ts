import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChecklistItem {
  id: string;
  text: string;
  completed: false;
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
    
    const { pdfFile, checklistType, organizationId } = await req.json();
    
    console.log('Processing PDF for checklist type:', checklistType);
    console.log('Organization ID:', organizationId);

    // Extract text from PDF
    const extractedText = await extractPdfText(pdfFile);
    console.log('Extracted text length:', extractedText.length);

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
            content: `Convert the following text into a structured JSON checklist. Each item should be short, actionable, and numbered if possible.

Return a JSON array where each item has:
- id: unique identifier (string)
- text: short, actionable instruction (string)
- completed: false (boolean)

Preserve numbered lists and bullet points. Make items concise but complete.`
          },
          {
            role: 'user',
            content: extractedText
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

    // Save the checklist to database
    const { data, error } = await supabase
      .from('custom_checklists')
      .upsert({
        organization_id: organizationId,
        checklist_type: checklistType,
        items: checklistItems,
        images: []
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
      itemsCount: checklistItems.length,
      imagesCount: 0,
      message: 'PDF successfully converted to interactive checklist'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to process PDF',
      details: 'Please ensure you uploaded a valid PDF file and try again'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Changed to 200 to avoid additional error handling
    });
  }
});

async function extractPdfText(base64File: string): Promise<string> {
  console.log('Starting PDF text extraction...');
  
  try {
    // Handle different base64 formats
    let base64Data = base64File;
    if (base64File.includes(',')) {
      base64Data = base64File.split(',')[1];
    }
    
    // Decode the PDF
    const binaryString = atob(base64Data);
    console.log('PDF file size:', binaryString.length, 'bytes');
    
    // Simple PDF text extraction using stream parsing
    let extractedText = '';
    const textObjects = [];
    
    // Look for text objects in PDF stream
    let i = 0;
    while (i < binaryString.length - 10) {
      // Look for text objects (BT...ET blocks)
      if (binaryString.substr(i, 2) === 'BT') {
        let endIndex = binaryString.indexOf('ET', i);
        if (endIndex > i) {
          const textBlock = binaryString.substring(i, endIndex + 2);
          textObjects.push(textBlock);
          i = endIndex + 2;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    
    console.log('Found text blocks:', textObjects.length);
    
    // Extract text from text objects
    for (const textBlock of textObjects) {
      // Look for text content in parentheses or brackets
      const textMatches = textBlock.match(/\([^)]+\)/g) || textBlock.match(/\[[^\]]+\]/g);
      if (textMatches) {
        for (const match of textMatches) {
          const cleanText = match
            .replace(/^\(|\)$|^\[|\]$/g, '') // Remove parentheses/brackets
            .replace(/\\[nrt]/g, ' ') // Replace escape sequences
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
          
          if (cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
            textObjects.push(cleanText);
          }
        }
      }
    }
    
    // If stream extraction didn't work well, try simple string extraction
    if (extractedText.length < 50) {
      console.log('Stream extraction yielded little text, trying fallback method...');
      
      const words = [];
      let currentWord = '';
      
      for (let i = 0; i < Math.min(binaryString.length, 50000); i++) {
        const char = binaryString[i];
        const charCode = char.charCodeAt(0);
        
        // Look for printable ASCII characters
        if (charCode >= 32 && charCode <= 126) {
          currentWord += char;
        } else {
          if (currentWord.length >= 3 && /[a-zA-Z]/.test(currentWord)) {
            words.push(currentWord);
          }
          currentWord = '';
        }
      }
      
      // Add the last word
      if (currentWord.length >= 3 && /[a-zA-Z]/.test(currentWord)) {
        words.push(currentWord);
      }
      
      // Filter meaningful words
      const meaningfulWords = words.filter(word => {
        const clean = word.trim();
        return clean.length >= 3 && 
               clean.length <= 50 &&
               !/^[\d\s\-_.()]+$/.test(clean) &&
               /[a-zA-Z]/.test(clean) &&
               !clean.match(/^[A-Z]{4,}$/) && // Skip all-caps sequences
               !clean.includes('obj') && // Skip PDF object references
               !clean.includes('endobj');
      });
      
      extractedText = meaningfulWords.slice(0, 300).join(' ');
      console.log('Fallback extraction found words:', meaningfulWords.length);
    }
    
    // Clean up final text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?()]/g, ' ')
      .trim();
    
    if (extractedText.length < 20) {
      extractedText = 'Unable to extract readable text from this PDF. The PDF may be image-based or encrypted. Please try copying and pasting the text content instead.';
    }
    
    console.log('Final extracted text length:', extractedText.length);
    console.log('Text preview:', extractedText.substring(0, 150) + '...');
    
    return extractedText;
    
  } catch (error) {
    console.error('Error in PDF extraction:', error);
    return 'PDF text extraction failed. Please copy and paste your checklist content as text instead.';
  }
}