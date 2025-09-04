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
    
    const { wordFile, checklistType, organizationId, imageFiles = [] } = await req.json();
    
    console.log('Processing Word document for checklist type:', checklistType);
    console.log('Organization ID:', organizationId);

    // Extract content from document and detect image markers
    const documentContent = await extractWordContent(wordFile);
    console.log('Extracted text length:', documentContent.text.length);
    
    // Detect image markers in text like [IMAGE:filename.jpg:description] or {{filename.jpg}}
    const imageMarkers = extractImageMarkers(documentContent.text);
    console.log('Found image markers:', imageMarkers.length);
    console.log('Provided image files:', imageFiles.length);

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
            content: `Convert the following text into a structured JSON checklist with enhanced formatting. 

CRITICAL INSTRUCTIONS:
1. ONLY convert numbered items, bullet points, and clear action steps into checklist items
2. DO NOT convert introductory text, headers, or general instructions into checklist items
3. Skip any text that appears to be setup instructions, tool preparation, or general information
4. Focus on actionable tasks that can be checked off

IMPORTANT: When you see image markers like [IMAGE:filename.jpg] or {{filename.jpg}}, associate them with the checklist item that immediately precedes them in the text. 

CRITICAL FOR CONSECUTIVE IMAGES: When multiple image markers appear together (like [IMAGE:Picture1.jpg] [IMAGE:Picture2.jpg] [IMAGE:Picture3.jpg]), ALL of these images belong to the same preceding checklist item. You MUST capture ALL consecutive image markers that follow a checklist item.

DO NOT include the image markers in the item text - remove them and put ALL marker references in the imageMarker field.

Return a JSON array where each item has:
- id: unique identifier (string)  
- text: the instruction text WITHOUT any image markers (clean text only)
- completed: false (boolean)
- imageMarker: if image markers appear after this item in the original text, include ALL markers that follow this item, even if they're grouped together (string with comma-separated markers like "Picture1.jpg,Picture2.jpg,Picture3.jpg,Picture4.jpg,Picture5.jpg", optional)
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

ONLY include items that are actual tasks to be completed. When multiple image markers appear after one checklist item, include all markers separated by commas in the imageMarker field.`
          },
          {
            role: 'user',
            content: documentContent.text
          }
        ],
        max_tokens: 8000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    let checklistItems: ChecklistItem[] = [];
    
    try {
      const aiContent = openAIData.choices[0]?.message?.content || '[]';
      console.log('Raw OpenAI response:', aiContent);
      
      // Clean up the response - remove markdown formatting
      let cleanContent = aiContent.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Extract JSON array from response
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      let jsonStr = jsonMatch ? jsonMatch[0] : cleanContent;
      
      console.log('Extracted JSON string:', jsonStr.substring(0, 200) + '...');
      
      // Try to parse the JSON
      try {
        checklistItems = JSON.parse(jsonStr);
        console.log('Successfully parsed JSON, items:', checklistItems.length);
        
        // Debug: Check which items have imageMarker fields
        console.log('=== OPENAI IMAGE MARKER ANALYSIS ===');
        checklistItems.forEach((item, index) => {
          if (item.imageMarker) {
            console.log(`Item ${index + 1} has imageMarker:`, item.imageMarker);
            console.log(`Item ${index + 1} text:`, item.text.substring(0, 100));
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
          checklistItems = JSON.parse(jsonStr);
          console.log('Successfully parsed JSON after cleanup, items:', checklistItems.length);
        } catch (secondParseError) {
          console.error('JSON parse error after cleanup:', secondParseError);
          console.error('Failed JSON string:', jsonStr);
          
          // Fallback: Create a simple checklist from numbered/bulleted items
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
          
          console.log('Created fallback checklist with', textLines.length, 'items');
          checklistItems = textLines.map((line, index) => ({
            id: `item-${index + 1}`,
            text: line.trim(),
            completed: false,
            formatting: {
              type: 'step',
              icon: 'check-circle'
            }
          }));
          
          console.log('Created fallback checklist with', checklistItems.length, 'items');
        }
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('OpenAI response data:', openAIData);
      throw new Error('Failed to parse AI response into valid JSON');
    }

    console.log('Generated checklist items:', checklistItems.length);

    // Process image markers and associate with provided image files
    const processedItems = await processImageMarkersAndFiles(
      checklistItems,
      imageMarkers,
      imageFiles,
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
        images: imageMarkers.map((marker, idx) => ({
          id: `marker-${idx}`,
          marker: marker.marker,
          filename: marker.filename,
          description: marker.description,
          matched: marker.matched || false
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
      imageMarkersCount: imageMarkers.length,
      matchedImagesCount: imageMarkers.filter(m => m.matched).length,
      message: 'Document successfully converted to enhanced interactive checklist'
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
      .replace(/[^\w\s\-.,!?()'"":;/\\&%$#@]/g, ' ') // Keep quotes, colons, semicolons and other common punctuation
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
  organizationId: string
): Promise<ChecklistItem[]> {
  const processedItems = [...items];
  
  console.log('Processing image markers:', markers.length);
  console.log('Available image files:', imageFiles.map(f => f.filename));
  console.log('Checklist items with imageMarker fields:', processedItems.filter(item => item.imageMarker).length);
  
  // Add safety check for empty markers
  if (!markers || markers.length === 0) {
    console.log('No image markers to process');
    return processedItems;
  }
  
  // Create a list to track which items already have images
  const itemsWithImages = new Set<number>();
  
  // Match image markers with provided files and embed them
  for (const marker of markers) {
    const matchingFile = imageFiles.find(file => 
      file.filename.toLowerCase() === marker.filename.toLowerCase() ||
      file.filename.toLowerCase().includes(marker.filename.toLowerCase()) ||
      marker.filename.toLowerCase().includes(file.filename.toLowerCase())
    );
    
    if (matchingFile) {
      console.log(`Matching file found for marker ${marker.marker}: ${matchingFile.filename}`);
      
      try {
        // Upload image to Supabase Storage
        const fileExtension = matchingFile.filename.split('.').pop() || 'jpg';
        const fileName = `${organizationId}/checklist-${Date.now()}-${marker.filename}`;
        
        // Convert base64 to buffer
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
          console.error('Image upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('checklist-images')
          .getPublicUrl(fileName);

        console.log(`Image uploaded successfully: ${publicUrl}`);

        let imageAssociated = false;
        let targetItemIndex = -1;

        // Strategy 1: Find items with matching imageMarker field set by OpenAI
        for (let i = 0; i < processedItems.length; i++) {
          if (processedItems[i].imageMarker) {
            // Handle comma-separated markers in the imageMarker field
            const itemMarkers = processedItems[i].imageMarker.split(',').map(m => m.trim());
            
            for (const itemMarker of itemMarkers) {
              if (itemMarker.toLowerCase().includes(marker.filename.toLowerCase()) || 
                  marker.marker.toLowerCase().includes(itemMarker.toLowerCase().replace(/[\[\]]/g, '')) ||
                  marker.filename.toLowerCase().includes(itemMarker.toLowerCase().replace(/[\[\]IMAGE:]/g, ''))) {
                targetItemIndex = i;
                console.log(`Strategy 1: Found imageMarker match for item ${i + 1} via marker "${itemMarker}": ${processedItems[i].text.substring(0, 50)}...`);
                break;
              }
            }
            if (targetItemIndex !== -1) break;
          }
        }

        // Strategy 2: Find items that contain the exact marker in text
        if (targetItemIndex === -1) {
          for (let i = 0; i < processedItems.length; i++) {
            if (processedItems[i].text.includes(marker.marker)) {
              targetItemIndex = i;
              // Remove the marker from display text
              processedItems[i].text = processedItems[i].text.replace(marker.marker, '').trim();
              console.log(`Strategy 2: Found text marker match for item ${i + 1}: ${processedItems[i].text.substring(0, 50)}...`);
              break;
            }
          }
        }

        // Strategy 3: Match by filename reference in text
        if (targetItemIndex === -1) {
          const baseFilename = marker.filename.toLowerCase().replace(/\.[^.]+$/, '');
          for (let i = 0; i < processedItems.length; i++) {
            if (processedItems[i].text.toLowerCase().includes(baseFilename)) {
              targetItemIndex = i;
              console.log(`Strategy 3: Found filename reference for item ${i + 1}: ${processedItems[i].text.substring(0, 50)}...`);
              break;
            }
          }
        }

        // If we found a target item, assign the image
        if (targetItemIndex !== -1) {
          // Check if this item already has an image
          if (itemsWithImages.has(targetItemIndex)) {
            // If the item already has an image, create additional image fields
            const existingImageCount = processedItems[targetItemIndex].additionalImages?.length || 0;
            if (!processedItems[targetItemIndex].additionalImages) {
              processedItems[targetItemIndex].additionalImages = [];
            }
            
            processedItems[targetItemIndex].additionalImages!.push({
              url: publicUrl,
              description: marker.description || `Image: ${marker.filename}`,
              filename: marker.filename
            });
            
            console.log(`Added additional image ${existingImageCount + 1} to item ${targetItemIndex + 1}: ${processedItems[targetItemIndex].text.substring(0, 50)}...`);
          } else {
            // First image for this item
            processedItems[targetItemIndex].imageUrl = publicUrl;
            processedItems[targetItemIndex].imageDescription = marker.description || `Image: ${marker.filename}`;
            processedItems[targetItemIndex].imagePosition = 'after';
            processedItems[targetItemIndex].imageMarker = marker.marker;
            itemsWithImages.add(targetItemIndex);
            
            console.log(`Associated primary image with item ${targetItemIndex + 1}: ${processedItems[targetItemIndex].text.substring(0, 50)}...`);
          }
          
          imageAssociated = true;
          marker.matched = true;
        } else {
          console.warn(`Could not find appropriate item for image ${marker.filename} - no matching content found`);
        }
        
      } catch (error) {
        console.error('Error processing image for marker:', marker.marker, error);
      }
    } else {
      console.log(`No matching file found for marker: ${marker.marker} (looking for: ${marker.filename})`);
    }
  }

  return processedItems;
}