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
  imageMarker?: string; // Original marker from text like [IMAGE:filename.jpg:description]
  imageSize?: 'small' | 'medium' | 'large'; // Add missing imageSize property
  imageUrls?: string[]; // Add missing imageUrls property
  additionalImages?: Array<{
    url: string;
    description: string;
    filename: string;
  }>;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    type?: 'step' | 'warning' | 'note' | 'header';
    icon?: string;
  };
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
    
    const { wordFile, checklistType, organizationId, imageFiles = [], matchedImages = [] } = await req.json();
    
    console.log('Processing Word document for checklist type:', checklistType);
    console.log('Organization ID:', organizationId);

    // Extract content from document and detect image markers
    const documentContent = await extractWordContent(wordFile);
    console.log('Extracted text length:', documentContent.text.length);
    
    // Detect image markers in text like [IMAGE:filename.jpg:description] or {{filename.jpg}}
    const imageMarkers = extractImageMarkers(documentContent.text);
    console.log('Found image markers:', imageMarkers.length);
    console.log('Provided image files:', imageFiles.length);
    console.log('Matched images from library:', matchedImages.length);

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
            content: `Convert the following text into a structured JSON object with both introductory content and checklist items.

CRITICAL INSTRUCTIONS:
1. ONLY convert numbered items, bullet points, and clear action steps into checklist items
2. PRESERVE introductory text, headers, or general instructions as separate introductory content
3. Focus on actionable tasks that can be checked off for the checklist
4. Keep all introductory text that appears before the first numbered/bulleted item

CRITICAL TEXT PRESERVATION: 
- NEVER abbreviate, truncate, or summarize instruction text
- PRESERVE THE COMPLETE AND FULL text of each instruction paragraph
- If an instruction has 6 sentences, include ALL 6 sentences in the checklist item
- DO NOT shorten or condense any instruction content
- Maintain the EXACT wording and complete details of each step

IMPORTANT: When you see image markers like [IMAGE:filename.jpg] or {{filename.jpg}}, associate them with the checklist item that immediately precedes them in the text.

CRITICAL FOR CONSECUTIVE IMAGES: When multiple image markers appear together (like [IMAGE:Picture1.jpg] [IMAGE:Picture2.jpg] [IMAGE:Picture3.jpg]), ALL of these images belong to the same preceding checklist item. You MUST capture ALL consecutive image markers that follow a checklist item.

CRITICAL MARKER PRESERVATION: When extracting image markers, preserve the EXACT marker name as it appears in the source text. Do NOT add file extensions like .jpg or .png if they are not present in the original marker. For example:
- If the text has [IMAGE:Bear1], the imageMarker should be "Bear1" (not "Bear1.jpg")  
- If the text has [IMAGE:Camera2], the imageMarker should be "Camera2" (not "Camera2.jpg")
- Only include file extensions if they appear in the original text

DO NOT include the image markers in the item text - remove them and put ALL marker references in the imageMarker field.

Return a JSON object with this structure:
{
  "introductoryText": "All text that appears before the first numbered/bulleted item, preserving paragraphs and formatting",
  "items": [array of checklist items]
}

Each checklist item has:
- id: unique identifier (string)  
- text: the COMPLETE AND FULL instruction text WITHOUT any image markers (preserve ALL sentences and details)
- completed: false (boolean)
- imageMarker: if image markers appear after this item in the original text, include ALL markers that follow this item, preserving EXACT marker names from source text without adding file extensions (string with comma-separated markers like "Picture1,Picture2,Picture3" - only add extensions if present in original text, optional)
- formatting: object with formatting hints:
  - bold: true if text should be bold (for important steps, warnings)
  - italic: true if text should be italic (for notes, tips)
  - type: "step"|"warning"|"note"|"header" based on content
  - icon: suggest lucide-react icon name based on content (wrench, alert-triangle, info, etc.)

Parse markdown-style formatting:
- **bold text** becomes formatting.bold: true
- *italic text* becomes formatting.italic: true  
- Text with "WARNING", "CAUTION", "DANGER" gets type: "warning"
- Text with "NOTE", "TIP", "INFO" gets type: "note"
- Detect tools and suggest appropriate icons

ONLY include items that are actual tasks to be completed. When multiple image markers appear after one checklist item, include all markers separated by commas in the imageMarker field. REMEMBER: PRESERVE COMPLETE INSTRUCTION TEXT WITHOUT ANY TRUNCATION OR ABBREVIATION.`
          },
          {
            role: 'user',
            content: documentContent.text
          }
        ],
        max_tokens: 12000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    let checklistItems: ChecklistItem[] = [];
    
    // Declare responseData at function scope for proper access throughout
    let responseData: { introductoryText?: string; items: ChecklistItem[] } = { introductoryText: "", items: [] };
    
    try {
      const aiContent = openAIData.choices[0]?.message?.content || '{"introductoryText": "", "items": []}';
      console.log('Raw OpenAI response:', aiContent);
      
      // Clean up the response - remove markdown formatting
      let cleanContent = aiContent.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Extract JSON object from response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[0] : cleanContent;
      
      console.log('Extracted JSON string:', jsonStr.substring(0, 200) + '...');
      
      // Try to parse the JSON
      try {
        responseData = JSON.parse(jsonStr);
        checklistItems = responseData.items || [];
        console.log('Successfully parsed JSON, items:', checklistItems.length);
        console.log('Introductory text length:', responseData.introductoryText?.length || 0);
        
        // Debug: Check which items have imageMarker fields
        console.log('=== OPENAI IMAGE MARKER ANALYSIS ===');
        checklistItems.forEach((item, index) => {
          if (item.imageMarker) {
            console.log(`Item ${index + 1} has imageMarker:`, item.imageMarker);
            console.log(`Item ${index + 1} text:`, item.text.substring(0, 100));
            
            // Check for inconsistency: marker contains file extensions when it shouldn't
            if (item.imageMarker.includes('.jpg') || item.imageMarker.includes('.png')) {
              console.log('⚠️ WARNING: AI added file extension to marker:', item.imageMarker);
            }
          }
        });
        console.log('Items with imageMarker:', checklistItems.filter(item => item.imageMarker).length);
        
      } catch (firstParseError) {
        console.log('First parse failed, trying to fix common JSON issues...');
        
        // Try to fix common JSON issues
        jsonStr = jsonStr
          .replace(/,\s*}/g, '}') // Remove trailing commas before }
          .replace(/,\s*]/g, ']') // Remove trailing commas before ]
          .replace(/\n/g, ' ')    // Replace newlines with spaces
          .replace(/\t/g, ' ')    // Replace tabs with spaces
          .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
          .trim();
        
        try {
          responseData = JSON.parse(jsonStr);
          checklistItems = responseData.items || [];
          console.log('Successfully parsed JSON after cleanup, items:', checklistItems.length);
        } catch (secondParseError) {
          console.error('JSON parse error after cleanup:', secondParseError);
          console.error('Failed JSON string:', jsonStr);
          
          // Fallback: Create a simple checklist from numbered/bulleted items
          responseData = { introductoryText: "", items: [] };
          const textLines = documentContent.text.split('\n')
            .filter(line => {
              const trimmed = line.trim();
              // Only include lines that look like actual checklist items
              return trimmed.length > 0 && (
                /^\d+\./.test(trimmed) || // Numbered items like "1."
                /^[-•*]/.test(trimmed) || // Bullet points
                /^\w+\.\s/.test(trimmed) // Letter items like "a."
              );
            });
          
          responseData.items = textLines.map((line, index) => ({
            id: `item-${index + 1}`,
            text: line.trim().replace(/^\d+\.\s*|^[-•*]\s*|^\w+\.\s*/, ''), // Remove numbering/bullets
            completed: false,
            formatting: {
              type: 'step' as const,
              icon: 'check'
            }
          })) as ChecklistItem[];
          checklistItems = responseData.items;
        }
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('OpenAI response data:', openAIData);
      throw new Error('Failed to parse AI response into valid JSON');
    }

    console.log('Generated checklist items:', checklistItems.length);

    const finalItems = await processImageMarkersAndFiles(
      checklistItems,
      imageMarkers,
      imageFiles,
      supabase,
      organizationId,
      matchedImages
    );

    // Save to database
    const { data, error } = await supabase
      .from('custom_checklists')
      .upsert({
        organization_id: organizationId,
        checklist_type: checklistType,
        items: finalItems,
        introductory_text: responseData?.introductoryText || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      itemsCount: finalItems.length,
      imageMarkersCount: imageMarkers.length,
      matchedImagesCount: [...imageMarkers.filter(m => m.matched), ...matchedImages].length,
      introductoryTextLength: responseData?.introductoryText?.length || 0,
      message: 'Document successfully converted to enhanced interactive checklist'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Word document:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? (error as any).cause : undefined
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process Word document',
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
    
    // Clean up the final text with proper character encoding
    extractedText = extractedText
      // Fix smart quotes and special characters first
      .replace(/[""]/g, '"')           // Smart double quotes → regular quotes
      .replace(/['']/g, "'")           // Smart single quotes → regular apostrophe  
      .replace(/[‚„]/g, "'")           // Other quote variants
      .replace(/[«»]/g, '"')           // French quotes
      .replace(/[—–]/g, '-')           // Em dash, en dash → regular dash
      .replace(/[…]/g, '...')          // Ellipsis → three dots
      .replace(/[â€™]/g, "'")          // Common encoding corruption for apostrophe
      .replace(/[â€œâ€]/g, '"')       // Common encoding corruption for quotes  
      .replace(/[â€"]/g, '-')          // Common encoding corruption for dash
      .replace(/[Â]/g, ' ')            // Non-breaking space corruption
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?()'"":;/\\&%$#@\[\]]/g, ' ') // Keep quotes, brackets, and common punctuation
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

// Extract image markers from text with robust error handling
function extractImageMarkers(text: string): Array<{
  marker: string;
  filename: string;
  description?: string;
  position: number;
  matched?: boolean;
}> {
  const markers = [];
  
  try {
    console.log('=== IMAGE MARKER EXTRACTION DEBUG ===');
    console.log('Text sample around images:', text.substring(Math.max(0, text.indexOf('[IMAGE:') - 50), text.indexOf('[IMAGE:') + 200));
    
    // More robust pattern for [IMAGE:filename.jpg:description] format
    // This pattern ensures we don't match across malformed brackets
    const imagePattern = /\[IMAGE:([^:\[\]]+(?:\.[a-zA-Z]{2,4})?):?([^\[\]]*?)\]/gi;
    let match;
    
    while ((match = imagePattern.exec(text)) !== null) {
      const filename = match[1].trim();
      const description = match[2] ? match[2].trim() : undefined;
      
      console.log('Found image marker:', match[0], 'Filename:', filename, 'Position:', match.index);
      
      // Validate filename - should have reasonable length and no invalid characters
      if (filename.length > 0 && filename.length < 100 && !filename.includes('[') && !filename.includes(']')) {
        markers.push({
          marker: match[0],
          filename: filename,
          description: description,
          position: match.index,
          matched: false
        });
      } else {
        console.warn('Skipping malformed image marker:', match[0]);
      }
    }
    
    // Pattern for {{filename.jpg}} format
    const bracketPattern = /\{\{([^{}]+)\}\}/gi;
    while ((match = bracketPattern.exec(text)) !== null) {
      const filename = match[1].trim();
      
      console.log('Found bracket marker:', match[0], 'Filename:', filename, 'Position:', match.index);
      
      // Validate filename
      if (filename.length > 0 && filename.length < 100) {
        markers.push({
          marker: match[0],
          filename: filename,
          description: undefined,
          position: match.index,
          matched: false
        });
      } else {
        console.warn('Skipping malformed bracket marker:', match[0]);
      }
    }
    
    console.log('Successfully extracted', markers.length, 'valid image markers');
    return markers.sort((a, b) => a.position - b.position);
    
  } catch (error) {
    console.error('Error extracting image markers:', error);
    // Return empty array on error to prevent crash
    return [];
  }
}

async function processImageMarkersAndFiles(
  items: ChecklistItem[],
  markers: Array<{marker: string; filename: string; description?: string; position: number; matched?: boolean}>,
  imageFiles: Array<{filename: string; data: string; contentType?: string}>,
  supabase: any,
  organizationId: string,
  matchedImages: Array<{marker: string, imageUrl: string, description?: string}> = []
): Promise<ChecklistItem[]> {
  console.log('🚨 FUNCTION CALLED - processImageMarkersAndFiles');
  console.log('🚨 Items count:', items.length);
  console.log('🚨 Markers count:', markers.length);
  console.log('🚨 Image files count:', imageFiles.length);
  console.log('🚨 Matched images count:', matchedImages.length);
  
  const processedItems = [...items];
  
  console.log('=== IMAGE PROCESSING DEBUG ===');
  console.log('Processing image markers:', markers.length);
  console.log('Available image files:', imageFiles.map(f => f.filename));
  console.log('Matched images:', matchedImages.map(m => m.marker));
  
  if (!markers || markers.length === 0) {
    console.log('❌ No image markers to process');
    return processedItems;
  }

  // First, process matched images (existing images from library)
  for (const match of matchedImages) {
    console.log(`\n🚨 --- Processing matched image: ${match.marker} ---`);
    
    // Find the marker in our markers array - improve matching
    const markerObj = markers.find(m => {
      const cleanMarkerName = m.marker
        .replace(/^\[IMAGE:/, '') // Remove [IMAGE: prefix
        .replace(/:[^:\]]*\]$/, '') // Remove :description] suffix
        .replace(/\]$/, '') // Remove ] suffix
        .replace(/^\{\{/, '') // Remove {{ prefix
        .replace(/\}\}$/, '') // Remove }} suffix
        .replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, '') // Remove file extension
        .trim();
      
      const cleanMatchMarker = match.marker
        .replace(/^\[IMAGE:/, '') // Remove [IMAGE: prefix
        .replace(/:[^:\]]*\]$/, '') // Remove :description] suffix
        .replace(/\]$/, '') // Remove ] suffix
        .replace(/^\{\{/, '') // Remove {{ prefix
        .replace(/\}\}$/, '') // Remove }} suffix
        .replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, '') // Remove file extension
        .trim();
        
      console.log(`🔍 Comparing markers: "${cleanMarkerName}" vs "${cleanMatchMarker}"`);
      return cleanMarkerName.toLowerCase() === cleanMatchMarker.toLowerCase() ||
             cleanMarkerName.toLowerCase().includes(cleanMatchMarker.toLowerCase()) ||
             cleanMatchMarker.toLowerCase().includes(cleanMarkerName.toLowerCase());
    });

    if (!markerObj) {
      console.log(`❌ No corresponding marker found for ${match.marker}`);
      continue;
    }

    console.log(`✅ Found corresponding marker at position ${markerObj.position}`);

    // Find the appropriate checklist item for this marker
    let targetItemIndex = -1;

    // Strategy 1: Check if OpenAI put this image in an imageMarker field
    console.log('🔍 Strategy 1: Checking imageMarker fields...');
    for (let j = 0; j < processedItems.length; j++) {
      if (processedItems[j].imageMarker) {
        const itemMarkers = processedItems[j].imageMarker!.split(',').map(m => m.trim().toLowerCase());
        const searchTerms = [
          markerObj.filename.toLowerCase(),
          markerObj.filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif)$/i, ''),
        ];
        
        for (const searchTerm of searchTerms) {
          if (itemMarkers.some(im => im.includes(searchTerm) || searchTerm.includes(im))) {
            targetItemIndex = j;
            console.log(`✅ Strategy 1: Found in imageMarker field of item ${j + 1}`);
            break;
          }
        }
      }
      if (targetItemIndex !== -1) break;
    }

    // Strategy 2: Position-based assignment if no imageMarker match
    if (targetItemIndex === -1) {
      console.log('🔍 Strategy 2: Position-based assignment...');
      const relativePosition = markerObj.position / 10000;
      const estimatedItemIndex = Math.min(
        Math.floor(relativePosition * processedItems.length),
        processedItems.length - 1
      );
      
      if (estimatedItemIndex === 0 && markerObj.position > 1000) {
        targetItemIndex = Math.min(1, processedItems.length - 1);
        console.log(`✅ Strategy 2: Avoiding first item, using item ${targetItemIndex + 1}`);
      } else {
        targetItemIndex = Math.max(0, estimatedItemIndex);
        console.log(`✅ Strategy 2: Position-based assignment to item ${targetItemIndex + 1}`);
      }
    }

      // Save matched image to checklist_images table if not already there
      const { error: dbError } = await supabase
        .from('checklist_images')
        .upsert({
          organization_id: organizationId,
          image_url: match.imageUrl,
          original_filename: match.marker,
          marker_name: match.marker.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, ''),
          usage_count: 1,
          uploaded_by_user_id: null
        });

      if (dbError) {
        console.warn('⚠️ Failed to update checklist_images table for matched image:', dbError);
      }

      // Assign the matched image to the checklist item
    if (targetItemIndex >= 0 && targetItemIndex < processedItems.length) {
      console.log(`🎯 Assigning matched image to item ${targetItemIndex + 1}`);
      
      if (!processedItems[targetItemIndex].imageUrl) {
        console.log('📋 Assigning as PRIMARY image');
        processedItems[targetItemIndex].imageUrl = match.imageUrl;
        processedItems[targetItemIndex].imageDescription = match.description || markerObj.description || "";
        processedItems[targetItemIndex].imagePosition = 'after';
        processedItems[targetItemIndex].imageSize = 'medium';
      } else {
        console.log('📋 Assigning as ADDITIONAL image');
        if (!processedItems[targetItemIndex].imageUrls) {
          processedItems[targetItemIndex].imageUrls = [];
        }
        processedItems[targetItemIndex].imageUrls!.push(match.imageUrl);
      }
      
      markerObj.matched = true;
      console.log(`✅ Matched image ${match.marker} assigned to item ${targetItemIndex + 1}`);
    }
  }

  // Now process remaining markers with uploaded files (skip already matched markers)
  const unprocessedMarkers = markers.filter(m => !m.matched);
  // Sort unprocessed markers by position to process them in document order
  const sortedMarkers = unprocessedMarkers.sort((a, b) => a.position - b.position);
  console.log('🚨 Unprocessed markers to handle:', sortedMarkers.map(m => `${m.filename}@${m.position}`));
  
  if (sortedMarkers.length === 0) {
    console.log('✅ All markers already matched from library');
    return processedItems;
  }
  
  for (let i = 0; i < sortedMarkers.length; i++) {
    const marker = sortedMarkers[i];
    console.log(`\n🚨 --- Processing ${marker.filename} at position ${marker.position} (${i+1}/${sortedMarkers.length}) ---`);
    
    const matchingFile = imageFiles.find(file => 
      file.filename.toLowerCase().includes(marker.filename.toLowerCase()) ||
      marker.filename.toLowerCase().includes(file.filename.toLowerCase()) ||
      file.filename.toLowerCase() === marker.filename.toLowerCase()
    );

    if (!matchingFile) {
      console.log(`❌ No matching file found for ${marker.filename}`);
      console.log('Available files:', imageFiles.map(f => f.filename));
      continue;
    }
    
    console.log(`✅ Found matching file: ${matchingFile.filename}`);

    let targetItemIndex = -1;
    
    // Strategy 1: Check if OpenAI put this image in an imageMarker field
    console.log('🔍 Strategy 1: Checking imageMarker fields...');
    for (let j = 0; j < processedItems.length; j++) {
      if (processedItems[j].imageMarker) {
        const itemMarkers = processedItems[j].imageMarker!.split(',').map(m => m.trim().toLowerCase());
        console.log(`Item ${j+1} imageMarker:`, processedItems[j].imageMarker);
        
        const searchTerms = [
          marker.filename.toLowerCase(),
          marker.filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif)$/i, ''),
          marker.filename.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
        ];
        
        for (const searchTerm of searchTerms) {
          if (itemMarkers.some(im => im.includes(searchTerm) || searchTerm.includes(im))) {
            targetItemIndex = j;
            console.log(`✅ Strategy 1: Found in imageMarker field of item ${j + 1}`);
            break;
          }
        }
        if (targetItemIndex !== -1) break;
      }
    }

    // Strategy 2: Smart consecutive grouping - if previous image was assigned, and this image is close, use same item
    if (targetItemIndex === -1 && i > 0) {
      console.log('🔍 Strategy 2: Checking consecutive grouping...');
      const prevMarker = sortedMarkers[i - 1];
      const distance = marker.position - prevMarker.position;
      console.log(`Distance from previous image: ${distance} characters`);
      
      if (distance <= 100 && prevMarker.matched) { // Within 100 characters
        console.log('📏 Images are consecutive (≤100 chars), looking for previous assignment...');
        // Find where previous image was assigned
        for (let j = 0; j < processedItems.length; j++) {
          if (processedItems[j].imageUrl || processedItems[j].additionalImages?.length) {
            // Check if this item has the previous image
            const hasImage = processedItems[j].imageUrl?.includes(prevMarker.filename) ||
                            processedItems[j].additionalImages?.some(img => img.filename === prevMarker.filename);
            if (hasImage) {
              targetItemIndex = j;
              console.log(`✅ Strategy 2: Consecutive grouping with item ${j + 1} (distance: ${distance})`);
              break;
            }
          }
        }
      } else {
        console.log(`❌ Not consecutive - distance: ${distance}, prev matched: ${prevMarker.matched}`);
      }
    }

    // Strategy 3: Assign based on position - images go to the item that logically precedes them
    if (targetItemIndex === -1) {
      console.log('🔍 Strategy 3: Position-based assignment...');
      // Simple rule: assign to the item at roughly the same relative position in the checklist
      const relativePosition = marker.position / 10000; // Rough normalization
      const estimatedItemIndex = Math.min(
        Math.floor(relativePosition * processedItems.length),
        processedItems.length - 1
      );
      
      // Don't let images go to the very first item unless it's very early in the document
      if (estimatedItemIndex === 0 && marker.position > 1000) {
        targetItemIndex = Math.min(1, processedItems.length - 1);
        console.log(`✅ Strategy 3: Avoiding first item, using item ${targetItemIndex + 1}`);
      } else {
        targetItemIndex = Math.max(0, estimatedItemIndex);
        console.log(`✅ Strategy 3: Position-based assignment to item ${targetItemIndex + 1}`);
      }
    }

    console.log(`🎯 Final target: Item ${targetItemIndex + 1}`);

    // Upload and assign the image
    if (targetItemIndex >= 0 && targetItemIndex < processedItems.length) {
      try {
        console.log('📤 Uploading image...');
        const fileExtension = matchingFile.filename.split('.').pop() || 'jpg';
        const fileName = `${organizationId}/checklist-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
        const base64Data = matchingFile.data.includes(',') ? 
          matchingFile.data.split(',')[1] : matchingFile.data;
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('checklist-images')
          .upload(fileName, imageBuffer, {
            contentType: matchingFile.contentType || `image/${fileExtension}`,
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('checklist-images')
          .getPublicUrl(fileName);

        console.log(`✅ Image uploaded: ${publicUrl}`);

        // Save to checklist_images table for future auto-matching
        const { error: dbError } = await supabase
          .from('checklist_images')
          .upsert({
            organization_id: organizationId,
            image_url: publicUrl,
            original_filename: matchingFile.filename,
            marker_name: marker.filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, ''),
            usage_count: 0,
            uploaded_by_user_id: null, // Edge function upload
            file_size: imageBuffer.length,
            content_type: matchingFile.contentType || `image/${fileExtension}`
          });

        if (dbError) {
          console.warn('⚠️ Failed to save image to checklist_images table:', dbError);
        } else {
          console.log('✅ Image saved to checklist_images table');
        }

        // Assign to checklist item
        if (!processedItems[targetItemIndex].imageUrl) {
          console.log('📋 Assigning as PRIMARY image');
          processedItems[targetItemIndex].imageUrl = publicUrl;
          processedItems[targetItemIndex].imageDescription = marker.description || "";
          processedItems[targetItemIndex].imagePosition = 'after';
          processedItems[targetItemIndex].imageSize = 'medium'; // Default size
        } else {
          console.log('📋 Assigning as ADDITIONAL image');
          if (!processedItems[targetItemIndex].imageUrls) {
            processedItems[targetItemIndex].imageUrls = [];
          }
          processedItems[targetItemIndex].imageUrls!.push(publicUrl);
        }
        
        marker.matched = true;
        console.log(`✅ ${marker.filename} assigned to item ${targetItemIndex + 1}: ${processedItems[targetItemIndex].text.substring(0, 50)}...`);

      } catch (error) {
        console.error('❌ Error processing image:', marker.filename, error);
      }
    } else {
      console.log(`❌ Invalid target index: ${targetItemIndex}`);
    }
  }

  // Summary
  const totalAssigned = processedItems.filter(item => item.imageUrl || item.additionalImages?.length).length;
  console.log(`\n🚨 === SUMMARY: ${totalAssigned} items have images ===`);
  
  return processedItems;
}