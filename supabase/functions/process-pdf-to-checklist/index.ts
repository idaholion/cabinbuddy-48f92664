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
    
    const requestBody = await req.json();
    console.log('Raw request body:', requestBody);
    
    const { htmlFile, checklistType, organizationId } = requestBody;
    
    console.log('Processing HTML for checklist type:', checklistType);
    console.log('Organization ID:', organizationId);
    
    if (!htmlFile) {
      throw new Error('HTML file data is required');
    }
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Extract text from HTML
    const extractedText = await extractHtmlText(htmlFile);
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
            content: `Convert the following HTML text into a structured JSON checklist. Each item should be short, actionable, and numbered if possible.

Return a JSON array where each item has:
- id: unique identifier (string)
- text: short, actionable instruction (string)  
- completed: false (boolean)

Preserve numbered lists and bullet points from the HTML. Make items concise but complete. Focus on actionable tasks and instructions.`
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
      .insert({
        organization_id: organizationId,
        checklist_type: checklistType,
        items: checklistItems,
        images: []
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Database error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to save checklist to database: ${error.message}`);
    }

    console.log('Checklist saved successfully:', data.id);

    return new Response(JSON.stringify({
      success: true,
      checklistId: data.id,
      itemsCount: checklistItems.length,
      message: 'HTML successfully converted to checklist'
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

// Extract text content from HTML file
async function extractHtmlText(base64File: string): Promise<string> {
  console.log('Starting HTML text extraction...');
  
  try {
    // Handle different base64 formats
    let base64Data = base64File;
    if (base64File.includes(',')) {
      base64Data = base64File.split(',')[1];
    }
    
    // Convert base64 to text
    const htmlString = atob(base64Data);
    console.log('HTML file size:', htmlString.length, 'characters');
    
    // Remove HTML tags and extract text content
    let textContent = htmlString
      // Remove script and style content completely
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML tags but preserve list structure
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<ul[^>]*>/gi, '\n') 
      .replace(/<\/[ou]l>/gi, '\n')
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br[^>]*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Clean up HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Extracted text length:', textContent.length);
    console.log('Text preview:', textContent.substring(0, 200));
    
    if (textContent.length < 20) {
      return `Unable to extract meaningful text from this HTML file. Please ensure your HTML file contains readable text content and try again.`;
    }
    
    return textContent;
    
  } catch (error) {
    console.error('Error in HTML extraction:', error);
    return 'HTML processing failed. Please ensure you uploaded a valid HTML file.';
  }
}

// Convert PDF to images using a simple approach
async function convertPdfToImages(base64File: string): Promise<any[]> {
  console.log('Converting PDF to images...');
  
  try {
    // For now, we'll create a simple implementation that returns the PDF as a single "page"
    // In a production environment, you'd want to use a proper PDF-to-image library
    
    // Clean the base64 data
    let base64Data = base64File;
    if (base64File.includes(',')) {
      base64Data = base64File.split(',')[1];
    }
    
    // Create a data URL for the PDF
    const pdfDataUrl = `data:application/pdf;base64,${base64Data}`;
    
    // Return a single page object - the frontend will handle PDF rendering
    return [{
      page: 1,
      imageUrl: pdfDataUrl,
      width: 800,
      height: 1200
    }];
    
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error('Failed to process PDF pages');
  }
}

async function extractPdfText(base64File: string): Promise<string> {
  console.log('Starting simple text extraction...');
  
  try {
    // Handle different base64 formats
    let base64Data = base64File;
    if (base64File.includes(',')) {
      base64Data = base64File.split(',')[1];
    }
    
    // Convert base64 to text
    const binaryString = atob(base64Data);
    console.log('PDF file size:', binaryString.length, 'bytes');
    
    // Simple approach: find actual readable text content
    const readableText = extractReadableContent(binaryString);
    
    if (readableText.length < 20) {
      return `Unable to extract text from this PDF. Please try one of these alternatives:

1. Copy and paste the text content directly into the text area below
2. Convert your PDF to a text file first
3. Use a PDF with selectable text (not scanned images)

If your PDF contains a checklist or instructions, please manually copy that content and paste it here instead.`;
    }
    
    return readableText;
    
  } catch (error) {
    console.error('Error in PDF extraction:', error);
    return 'PDF processing failed. Please copy and paste your checklist content as text instead.';
  }
}

function extractReadableContent(data: string): string {
  console.log('Extracting readable content...');
  
  const sentences: string[] = [];
  const minSentenceLength = 10;
  const maxSentenceLength = 200;
  
  // Look for complete sentences or phrases
  let buffer = '';
  let inReadableSection = false;
  
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    const code = char.charCodeAt(0);
    
    // Check if character is readable (letters, numbers, common punctuation, spaces)
    if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
      // Skip PDF commands and metadata
      if (buffer.length === 0) {
        // Skip if starting with PDF keywords
        const preview = data.substring(i, i + 20);
        if (preview.match(/^(obj|endobj|stream|endstream|xref|trailer|PDF|Type|Filter|Length|Font|Page)/)) {
          // Skip past this keyword
          while (i < data.length && data.charCodeAt(i) >= 32 && data.charCodeAt(i) <= 126) {
            i++;
          }
          continue;
        }
      }
      
      if (char === '\n' || char === '\r') {
        // Process accumulated buffer
        if (buffer.trim().length >= minSentenceLength && buffer.trim().length <= maxSentenceLength) {
          const cleanText = cleanSentence(buffer.trim());
          if (cleanText && isValidSentence(cleanText)) {
            sentences.push(cleanText);
          }
        }
        buffer = '';
        inReadableSection = false;
      } else {
        buffer += char;
        if (buffer.length > maxSentenceLength) {
          // Reset if too long
          buffer = '';
          inReadableSection = false;
        }
      }
    } else {
      // Non-readable character, process buffer if we have one
      if (buffer.trim().length >= minSentenceLength && buffer.trim().length <= maxSentenceLength) {
        const cleanText = cleanSentence(buffer.trim());
        if (cleanText && isValidSentence(cleanText)) {
          sentences.push(cleanText);
        }
      }
      buffer = '';
      inReadableSection = false;
    }
  }
  
  // Process final buffer
  if (buffer.trim().length >= minSentenceLength && buffer.trim().length <= maxSentenceLength) {
    const cleanText = cleanSentence(buffer.trim());
    if (cleanText && isValidSentence(cleanText)) {
      sentences.push(cleanText);
    }
  }
  
  // Join sentences and clean up
  const result = sentences
    .slice(0, 50) // Limit to first 50 sentences
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('Found sentences:', sentences.length);
  console.log('Sample sentences:', sentences.slice(0, 3));
  console.log('Final text preview:', result.substring(0, 200));
  
  return result;
}

function cleanSentence(text: string): string {
  return text
    .replace(/[^\w\s\-.,!?():;"']/g, ' ') // Keep only word characters and common punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidSentence(text: string): boolean {
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Must have reasonable letter to total ratio
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const ratio = letters / text.length;
  if (ratio < 0.3) return false;
  
  // Exclude common PDF artifacts
  const lowerText = text.toLowerCase();
  const excludePatterns = [
    /^(type|filter|length|font|page|obj|endobj|stream|endstream|xref|trailer)/,
    /pdf[\s\-]?1\./,
    /flatedecode/,
    /^[a-f0-9\s\-]+$/i, // hex patterns
    /^[\d\s\-.,]+$/, // only numbers and punctuation
    /^[A-Z\s\-]+$/, // all caps (usually metadata)
    /times.*roman|arial|helvetica/i, // font names
    /rgb|cmyk|device/i, // color space names
  ];
  
  for (const pattern of excludePatterns) {
    if (pattern.test(lowerText)) return false;
  }
  
  // Must contain actual words (not just random characters)
  const words = text.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2) return false;
  
  // Check for reasonable word patterns
  const validWords = words.filter(word => {
    return /^[a-zA-Z][a-zA-Z0-9]*$/.test(word) || // Normal words
           /^\d+$/.test(word) || // Numbers
           /^[a-zA-Z]+[.,!?]$/.test(word); // Words with punctuation
  });
  
  return validWords.length >= Math.max(1, words.length * 0.5);
}