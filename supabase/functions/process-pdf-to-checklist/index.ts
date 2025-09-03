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
  console.log('Starting improved PDF text extraction...');
  
  try {
    // Handle different base64 formats
    let base64Data = base64File;
    if (base64File.includes(',')) {
      base64Data = base64File.split(',')[1];
    }
    
    // Convert base64 to bytes
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('PDF file size:', bytes.length, 'bytes');
    
    // Try to extract text using improved heuristics
    return await advancedTextExtraction(binaryString);
    
  } catch (error) {
    console.error('Error in PDF extraction:', error);
    return 'PDF text extraction failed. The PDF may be image-based, encrypted, or corrupted. Please try copying and pasting the text content instead, or use a different PDF.';
  }
}

async function advancedTextExtraction(binaryString: string): Promise<string> {
  console.log('Using advanced text extraction method...');
  
  const extractedText: string[] = [];
  
  // Method 1: Look for text between parentheses in text objects
  const textObjectMatches = binaryString.match(/BT[\s\S]*?ET/g);
  if (textObjectMatches) {
    console.log('Found text objects:', textObjectMatches.length);
    
    for (const textObject of textObjectMatches) {
      // Extract text in parentheses: (text)
      const textInParens = textObject.match(/\([^)]*\)/g);
      if (textInParens) {
        for (const match of textInParens) {
          const cleanText = match
            .replace(/^\(|\)$/g, '') // Remove parentheses
            .replace(/\\[nrtf\\()]/g, ' ') // Handle escape sequences
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanText.length > 2 && /[a-zA-Z]/.test(cleanText) && !cleanText.match(/^[A-Z]{4,}$/)) {
            extractedText.push(cleanText);
          }
        }
      }
      
      // Extract text in brackets: [text]
      const textInBrackets = textObject.match(/\[[^\]]*\]/g);
      if (textInBrackets) {
        for (const match of textInBrackets) {
          const cleanText = match
            .replace(/^\[|\]$/g, '') // Remove brackets
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanText.length > 2 && /[a-zA-Z]/.test(cleanText)) {
            extractedText.push(cleanText);
          }
        }
      }
    }
  }
  
  // Method 2: Look for stream content between 'stream' and 'endstream'
  const streamMatches = binaryString.match(/stream[\s\S]*?endstream/g);
  if (streamMatches) {
    console.log('Found streams:', streamMatches.length);
    
    for (const stream of streamMatches) {
      // Remove 'stream' and 'endstream' markers
      const streamContent = stream.replace(/^stream\s*|\s*endstream$/g, '');
      
      // Extract readable ASCII text sequences
      let currentWord = '';
      for (let i = 0; i < Math.min(streamContent.length, 10000); i++) {
        const char = streamContent[i];
        const charCode = char.charCodeAt(0);
        
        if (charCode >= 32 && charCode <= 126) {
          currentWord += char;
        } else {
          if (currentWord.length >= 3 && /[a-zA-Z]/.test(currentWord)) {
            const cleanWord = currentWord.trim();
            if (!cleanWord.match(/^[^a-zA-Z]*$/) && 
                !cleanWord.includes('obj') && 
                !cleanWord.includes('endobj') &&
                cleanWord.length <= 50) {
              extractedText.push(cleanWord);
            }
          }
          currentWord = '';
        }
      }
      
      // Add final word
      if (currentWord.length >= 3 && /[a-zA-Z]/.test(currentWord)) {
        extractedText.push(currentWord.trim());
      }
    }
  }
  
  // Method 3: General readable text extraction
  if (extractedText.length < 5) {
    console.log('Applying general text extraction fallback...');
    
    let currentPhrase = '';
    let wordCount = 0;
    
    for (let i = 0; i < Math.min(binaryString.length, 50000); i++) {
      const char = binaryString[i];
      const charCode = char.charCodeAt(0);
      
      // Include letters, numbers, spaces, and common punctuation
      if ((charCode >= 32 && charCode <= 126) || char === '\n' || char === '\r') {
        if (char === '\n' || char === '\r') {
          if (currentPhrase.trim().length > 5 && wordCount >= 2) {
            extractedText.push(currentPhrase.trim());
          }
          currentPhrase = '';
          wordCount = 0;
        } else if (char === ' ') {
          if (currentPhrase.length > 0) {
            wordCount++;
          }
          currentPhrase += char;
        } else {
          currentPhrase += char;
        }
      } else {
        if (currentPhrase.trim().length > 5 && wordCount >= 2) {
          extractedText.push(currentPhrase.trim());
        }
        currentPhrase = '';
        wordCount = 0;
      }
    }
    
    // Add final phrase
    if (currentPhrase.trim().length > 5 && wordCount >= 2) {
      extractedText.push(currentPhrase.trim());
    }
  }
  
  // Clean and filter the extracted text
  const cleanedText = extractedText
    .filter(text => {
      const clean = text.trim();
      return clean.length >= 3 && 
             clean.length <= 200 &&
             /[a-zA-Z]/.test(clean) &&
             !clean.match(/^[0-9\s\-_.()]+$/) &&
             !clean.includes('obj') &&
             !clean.includes('endobj') &&
             !clean.includes('xref') &&
             !clean.includes('trailer') &&
             !clean.match(/^[A-F0-9]{8,}$/) &&
             !clean.match(/^PDF-/) &&
             !clean.match(/^Type\//) &&
             !clean.match(/^Filter\//) &&
             !clean.match(/^Length\s+\d+$/);
    })
    .slice(0, 100) // Limit to first 100 meaningful phrases
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('Extracted text length:', cleanedText.length);
  console.log('Text preview:', cleanedText.substring(0, 300));
  
  if (cleanedText.length < 20) {
    return 'Unable to extract readable text from this PDF. The PDF may be image-based, encrypted, or in an unsupported format. Please try:\n1. Converting the PDF to text format\n2. Copy and paste the content manually\n3. Use a different PDF with selectable text';
  }
  
  return cleanedText;
}