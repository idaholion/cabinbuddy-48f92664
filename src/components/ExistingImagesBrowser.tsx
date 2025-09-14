import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Image as ImageIcon, X } from 'lucide-react';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { ChecklistImageKey } from "@/lib/checklist-image-library";
import { useImageLibrary } from "@/hooks/useImageLibrary";
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface ExistingImagesBrowserProps {
  onImageSelect: (imageUrl: string, description?: string, originalMarker?: string) => void;
  currentImages?: string[];
  trigger?: React.ReactNode;
  sourceChecklistType?: 'closing' | 'opening' | 'seasonal' | 'maintenance';
  onAutoMatch?: (matches: Array<{marker: string, imageUrl: string, description?: string}>) => void;
  detectedMarkers?: string[];
}

export const ExistingImagesBrowser: React.FC<ExistingImagesBrowserProps> = ({
  onImageSelect,
  currentImages = [],
  trigger,
  sourceChecklistType = 'closing',
  onAutoMatch,
  detectedMarkers = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableImages, setAvailableImages] = useState<Array<{url: string, description?: string, originalMarker?: string}>>([]);
  const [hasAutoMatched, setHasAutoMatched] = useState(false);
  const [lastMatchedMarkers, setLastMatchedMarkers] = useState<string[]>([]);
  const { addImageToLibrary } = useImageLibrary();
  const { checklists } = useCustomChecklists();
  const { organization } = useOrganization();

  // Reset auto-match state when detected markers change
  useEffect(() => {
    const markersChanged = JSON.stringify(detectedMarkers) !== JSON.stringify(lastMatchedMarkers);
    if (markersChanged) {
      setHasAutoMatched(false);
      setLastMatchedMarkers([...detectedMarkers]);
    }
  }, [detectedMarkers, lastMatchedMarkers]);

  // Reset auto-match state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasAutoMatched(false);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Load images when dialog opens
  useEffect(() => {
    if (isOpen && organization?.id) {
      const loadImages = async () => {
        try {
          console.log('Loading images for organization:', organization.id);
          
          // Strategy 1: Get images from checklist_images table (preferred for auto-matching)
          const { data: checklistImages } = await supabase
            .from('checklist_images')
            .select('*')
            .eq('organization_id', organization.id);

          let images: Array<{url: string, description?: string, originalMarker?: string}> = [];
          
          if (checklistImages && checklistImages.length > 0) {
            console.log('Found images in checklist_images table:', checklistImages.length);
            
            images = checklistImages.map(img => ({
              url: img.image_url,
              description: img.marker_name || 'Uploaded image',
              originalMarker: img.marker_name
            }));
          } else {
            console.log('No images in checklist_images table, falling back to scanning checklists');
            // Strategy 2: Fallback - scan existing checklist items
            const sourceChecklist = checklists.find(c => c.checklist_type === sourceChecklistType);
            if (sourceChecklist) {
              // Extract images from top-level images field
              if (sourceChecklist.images && Array.isArray(sourceChecklist.images)) {
                const topLevelImages = sourceChecklist.images.map((img: any) => ({
                  url: typeof img === 'string' ? img : img.url,
                  description: typeof img === 'object' ? img.description || img.alt : undefined
                }));
                images.push(...topLevelImages);
              }
              
              // Extract images from individual checklist items
              if (sourceChecklist.items && Array.isArray(sourceChecklist.items)) {
                sourceChecklist.items.forEach((item: any) => {
                  // Parse original markers from imageMarker field
                  const originalMarkers = item.imageMarker ? 
                    item.imageMarker.split(',').map((m: string) => m.trim()) : [];
                  
                  // Single image URL
                  if (item.imageUrl) {
                    images.push({
                      url: item.imageUrl,
                      description: item.imageDescription || item.text?.substring(0, 50) + '...' || `Item ${item.id}`,
                      originalMarker: originalMarkers[0] // First marker for single image
                    });
                  }
                  
                  // Multiple image URLs
                  if (item.imageUrls && Array.isArray(item.imageUrls)) {
                    item.imageUrls.forEach((url: string, index: number) => {
                      images.push({
                        url: url,
                        description: item.imageDescription || item.text?.substring(0, 50) + '...' || `Item ${item.id} (${index + 1})`,
                        originalMarker: originalMarkers[index] // Match marker by index
                      });
                    });
                  }
                });
              }
            }
          }
          
          // Remove duplicates based on URL
          const uniqueImages = images.filter((img, index, arr) => 
            arr.findIndex(i => i.url === img.url) === index
          );
          
          setAvailableImages(uniqueImages);
          console.log('Total unique images found:', uniqueImages.length);
        } catch (error) {
          console.error('Error loading images:', error);
          toast({
            title: "Error loading images",
            description: "Failed to load existing images. Please try again.",
            variant: "destructive"
          });
        }
      };

      loadImages();
    }
  }, [isOpen, organization?.id, checklists, sourceChecklistType]);

  // Auto-match logic - separate from image loading to prevent loops
  useEffect(() => {
    if (isOpen && !hasAutoMatched && onAutoMatch && detectedMarkers.length > 0 && availableImages.length > 0) {
      const performAutoMatch = async () => {
        try {
          console.log('=== AUTO-MATCH DEBUG START ===');
          console.log('Detected markers:', detectedMarkers);
          console.log('Available images:', availableImages.length);
          console.log('Available image markers:', availableImages.map(img => img.originalMarker).filter(Boolean));
          
          setHasAutoMatched(true); // Set flag immediately to prevent re-runs
          
          const matches: Array<{marker: string, imageUrl: string, description?: string}> = [];
          const usedImages = new Set<string>(); // Track used images to prevent duplicates
          
          // Improved normalization - handle brackets properly
          const normalizeMarker = (marker: string): string => {
            return marker
              .replace(/^\[IMAGE:/, '') // Remove [IMAGE: prefix
              .replace(/:[^:\]]*\]$/, '') // Remove :description] suffix
              .replace(/^\[/, '') // Remove opening bracket
              .replace(/\]$/, '') // Remove closing bracket
              .replace(/^\{\{/, '') // Remove {{ prefix
              .replace(/\}\}$/, '') // Remove }} suffix
              .replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, '') // Remove file extension
              .toLowerCase()
              .trim();
          };

          // Clean normalization for fuzzy matching only
          const cleanForFuzzy = (str: string): string => {
            return str.replace(/[^a-z0-9]/g, '').toLowerCase();
          };

          // Check for exact matches first (highest priority)
          const isExactMatch = (detected: string, available: string): boolean => {
            const normDetected = normalizeMarker(detected);
            const normAvailable = normalizeMarker(available);
            
            // Strategy 1: Perfect exact match
            if (normDetected === normAvailable) {
              return true;
            }
            
            // Strategy 2: Exact match ignoring spaces and separators
            const cleanDetected = normDetected.replace(/[\s\-_]/g, '');
            const cleanAvailable = normAvailable.replace(/[\s\-_]/g, '');
            return cleanDetected === cleanAvailable;
          };

          // Check for fuzzy matches (lower priority)
          const isFuzzyMatch = (detected: string, available: string): boolean => {
            console.log(`\n--- Fuzzy comparing "${detected}" vs "${available}" ---`);
            
            const normDetected = normalizeMarker(detected);
            const normAvailable = normalizeMarker(available);
            
            console.log(`Normalized: "${normDetected}" vs "${normAvailable}"`);
            
            // Skip fuzzy matching if strings are too different in length
            if (Math.abs(normDetected.length - normAvailable.length) > 3) {
              console.log('❌ Length difference too large');
              return false;
            }
            
            // Only allow fuzzy matching for strings with reasonable similarity
            const fuzzyDetected = cleanForFuzzy(normDetected);
            const fuzzyAvailable = cleanForFuzzy(normAvailable);
            
            if (fuzzyDetected.length >= 3 && fuzzyAvailable.length >= 3) {
              console.log(`Fuzzy comparison: "${fuzzyDetected}" vs "${fuzzyAvailable}"`);
              
              // Levenshtein distance similarity (increased threshold to 85%)
              const similarity = calculateSimilarity(fuzzyDetected, fuzzyAvailable);
              console.log(`Similarity score: ${Math.round(similarity * 100)}%`);
              
              if (similarity >= 0.85) {
                console.log('✅ HIGH SIMILARITY MATCH');
                return true;
              }
            }
            
            console.log('❌ NO FUZZY MATCH');
            return false;
          };

          // Calculate string similarity using Levenshtein distance
          const calculateSimilarity = (str1: string, str2: string): number => {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length <= str2.length ? str1 : str2;
            
            if (longer.length === 0) return 1.0;
            
            const editDistance = levenshteinDistance(longer, shorter);
            return (longer.length - editDistance) / longer.length;
          };

          // Levenshtein distance calculation
          const levenshteinDistance = (str1: string, str2: string): number => {
            const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
            
            for (let i = 0; i <= str1.length; i += 1) matrix[0][i] = i;
            for (let j = 0; j <= str2.length; j += 1) matrix[j][0] = j;
            
            for (let j = 1; j <= str2.length; j += 1) {
              for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                  matrix[j][i - 1] + 1,
                  matrix[j - 1][i] + 1,
                  matrix[j - 1][i - 1] + indicator
                );
              }
            }
            
            return matrix[str2.length][str1.length];
          };
          
          // STEP 1: Process exact matches first (highest priority)
          console.log('\n🎯 STEP 1: Processing EXACT matches...');
          detectedMarkers.forEach(marker => {
            if (usedImages.has(marker)) return; // Skip if already matched
            
            console.log(`\n🔍 Processing detected marker: "${marker}"`);
            
            // Clean the marker of prefixes/suffixes
            const cleanMarker = marker
              .replace(/^\[IMAGE:/, '')
              .replace(/:[^:\]]*\]$/, '')
              .replace(/^\[/, '') // Remove opening bracket
              .replace(/\]$/, '') // Remove closing bracket
              .trim();
            
            console.log(`Cleaned marker: "${cleanMarker}"`);
            
            // Handle comma-separated markers
            const markerParts = cleanMarker.split(',').map(part => part.trim()).filter(part => part);
            
            markerParts.forEach(markerPart => {
              console.log(`\n🎯 Looking for EXACT matches for: "${markerPart}"`);
              
              // Find exact matching image
              const matchingImage = availableImages.find(img => {
                if (!img.originalMarker || usedImages.has(img.url)) {
                  return false;
                }
                
                // Handle comma-separated original markers
                const originalParts = img.originalMarker.split(',').map(part => part.trim()).filter(part => part);
                
                // Check if any part matches exactly
                return originalParts.some(origPart => isExactMatch(markerPart, origPart));
              });
              
              if (matchingImage) {
                console.log(`🎉 EXACT MATCH FOUND: "${markerPart}" -> "${matchingImage.originalMarker}"`);
                matches.push({
                  marker: marker,
                  imageUrl: matchingImage.url,
                  description: matchingImage.description
                });
                usedImages.add(matchingImage.url); // Mark image as used
                usedImages.add(marker); // Mark marker as matched
              }
            });
          });
          
          // STEP 2: Process fuzzy matches for remaining markers (lower priority)
          console.log('\n🎯 STEP 2: Processing FUZZY matches for remaining markers...');
          detectedMarkers.forEach(marker => {
            if (usedImages.has(marker)) return; // Skip if already matched exactly
            
            console.log(`\n🔍 Processing remaining marker: "${marker}"`);
            
            // Clean the marker of prefixes/suffixes
            const cleanMarker = marker
              .replace(/^\[IMAGE:/, '')
              .replace(/:[^:\]]*\]$/, '')
              .replace(/^\[/, '') // Remove opening bracket
              .replace(/\]$/, '') // Remove closing bracket
              .trim();
            
            // Handle comma-separated markers
            const markerParts = cleanMarker.split(',').map(part => part.trim()).filter(part => part);
            
            markerParts.forEach(markerPart => {
              console.log(`\n🎯 Looking for FUZZY matches for: "${markerPart}"`);
              
              // Find fuzzy matching image
              const matchingImage = availableImages.find(img => {
                if (!img.originalMarker || usedImages.has(img.url)) {
                  return false;
                }
                
                // Handle comma-separated original markers
                const originalParts = img.originalMarker.split(',').map(part => part.trim()).filter(part => part);
                
                // Check if any part matches with fuzzy logic
                return originalParts.some(origPart => isFuzzyMatch(markerPart, origPart));
              });
              
              if (matchingImage) {
                console.log(`🎉 FUZZY MATCH FOUND: "${markerPart}" -> "${matchingImage.originalMarker}"`);
                matches.push({
                  marker: marker,
                  imageUrl: matchingImage.url,
                  description: matchingImage.description
                });
                usedImages.add(matchingImage.url); // Mark image as used
                usedImages.add(marker); // Mark marker as matched
              } else {
                console.log(`💔 NO MATCH for: "${markerPart}"`);
              }
            });
          });
          
          console.log(`\n=== FINAL RESULTS: ${matches.length}/${detectedMarkers.length} matches ===`);
          matches.forEach(match => console.log(`✅ ${match.marker} -> ${match.imageUrl}`));
          
          if (matches.length > 0) {
            onAutoMatch(matches);
            toast({
              title: "Auto-match Complete",
              description: `Successfully matched ${matches.length} of ${detectedMarkers.length} images`,
              duration: 4000,
            });
          } else {
            toast({
              title: "No Auto-matches Found", 
              description: "Check browser console for detailed matching analysis",
              variant: "destructive",
              duration: 4000,
            });
          }
        } catch (error) {
          console.error('Error during auto-match:', error);
          setHasAutoMatched(false);
        }
      };

      const timeoutId = setTimeout(performAutoMatch, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, hasAutoMatched, onAutoMatch, detectedMarkers, availableImages]);

  // Filter images based on search term
  const filteredImages = availableImages.filter(image => 
    !searchTerm || 
    (image.description && image.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    image.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImageSelect = async (image: {url: string, description?: string, originalMarker?: string}) => {
    onImageSelect(image.url, image.description, image.originalMarker);
    
    // Add to image library if not already there
    const filename = image.url.split('/').pop() || 'unknown';
    await addImageToLibrary(image.url, filename, image.originalMarker);
    
    setIsOpen(false);
    toast({ 
      title: "Image selected", 
      description: `Added image from ${sourceChecklistType} checklist` 
    });
  };

  const isImageSelected = (imageUrl: string) => {
    return currentImages.includes(imageUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            Browse Existing Photos ({availableImages.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Existing Images from {sourceChecklistType.charAt(0).toUpperCase() + sourceChecklistType.slice(1)} Checklist
          </DialogTitle>
          <DialogDescription>
            Reuse images from your {sourceChecklistType} checklist to maintain consistency and reduce redundancy.
            Found {availableImages.length} images to choose from.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search images by description or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[500px]">
            {filteredImages.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {availableImages.length === 0 
                    ? `No images found in ${sourceChecklistType} checklist`
                    : 'No images match your search'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredImages.map((image, index) => {
                  const selected = isImageSelected(image.url);
                  
                  return (
                    <div 
                      key={index} 
                      className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                        selected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleImageSelect(image)}
                    >
                      {/* Image Preview */}
                      <div className="aspect-square bg-muted relative">
                        <img
                          src={image.url}
                          alt={image.description || `Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%23999">Image</text></svg>';
                          }}
                        />
                        
                        {/* Selection overlay */}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all flex items-center justify-center">
                          {selected && (
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <X className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Image info */}
                      <div className="p-2 bg-background">
                        <p className="text-xs font-medium truncate">
                          {image.description || `Image ${index + 1}`}
                          {image.originalMarker && (
                            <Badge variant="outline" className="text-xs ml-1">
                              {image.originalMarker}
                            </Badge>
                          )}
                        </p>
                        {selected && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};