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
  const { addImageToLibrary } = useImageLibrary();
  const { checklists } = useCustomChecklists();
  const { organization } = useOrganization();

  useEffect(() => {
    if (isOpen) {
      const loadImages = async () => {
        if (!organization?.id) {
          console.log('No organization ID available');
          return;
        }

        // Strategy 1: Get images from checklist_images table (preferred for auto-matching)
        const { data: checklistImages } = await supabase
          .from('checklist_images')
          .select('*')
          .eq('organization_id', organization.id);

        let images: Array<{url: string, description?: string, originalMarker?: string}> = [];
        
        if (checklistImages && checklistImages.length > 0) {
          console.log('Found images in checklist_images table:', checklistImages.length);
          console.log('🔍 Database images with markers:', checklistImages.map(img => ({
            url: img.image_url.substring(img.image_url.lastIndexOf('/') + 1),
            marker_name: img.marker_name
          })));
          
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
        
        // Auto-match if markers are provided
        if (onAutoMatch && detectedMarkers.length > 0) {
          const matches: Array<{marker: string, imageUrl: string, description?: string}> = [];
          
          // Enhanced normalization function
          const normalizeMarker = (marker: string): string => {
            return marker
              .replace(/^\[IMAGE:/, '') // Remove [IMAGE: prefix
              .replace(/:[^:\]]*\]$/, '') // Remove :description] suffix
              .replace(/\]$/, '') // Remove ] suffix
              .replace(/^\{\{/, '') // Remove {{ prefix
              .replace(/\}\}$/, '') // Remove }} suffix
              .replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, '') // Remove file extension
              .replace(/[^a-z0-9]/gi, '') // Remove all non-alphanumeric characters
              .toLowerCase()
              .trim();
          };

          // Fuzzy matching function for similar markers
          const fuzzyMatch = (marker1: string, marker2: string): boolean => {
            const norm1 = normalizeMarker(marker1);
            const norm2 = normalizeMarker(marker2);
            
            console.log(`🚨   Fuzzy matching: "${norm1}" vs "${norm2}"`);
            
            // Exact match
            if (norm1 === norm2) {
              console.log(`🚨   ✅ Exact match: ${norm1}`);
              return true;
            }
            
            // Skip very short markers to avoid false matches
            if (norm1.length < 3 || norm2.length < 3) return false;
            
            // Check if one contains the other (for cases like "drain" vs "draina")
            if (norm1.includes(norm2) || norm2.includes(norm1)) {
              console.log(`🚨   ✅ Contains match: ${norm1} <-> ${norm2}`);
              return true;
            }
            
            // Check for partial similarity (at least 70% of the shorter string should match)
            const longer = norm1.length > norm2.length ? norm1 : norm2;
            const shorter = norm1.length <= norm2.length ? norm1 : norm2;
            
            if (shorter.length >= 4) {
              // Count matching characters in order
              let matchCount = 0;
              let j = 0;
              for (let i = 0; i < shorter.length && j < longer.length; i++) {
                while (j < longer.length && longer[j] !== shorter[i]) j++;
                if (j < longer.length) {
                  matchCount++;
                  j++;
                }
              }
              
              const similarity = matchCount / shorter.length;
              if (similarity >= 0.7) {
                console.log(`🚨   ✅ Partial match: ${shorter} in ${longer} (${Math.round(similarity * 100)}% similar)`);
                return true;
              }
            }
            
            return false;
          };
          
          detectedMarkers.forEach(marker => {
            console.log('🚨 Processing marker:', marker);
            
            // Handle comma-separated markers by splitting
            const cleanMarker = marker
              .replace(/^\[IMAGE:/, '') // Remove [IMAGE: prefix
              .replace(/:[^:\]]*\]$/, '') // Remove :description] suffix
              .replace(/\]$/, '') // Remove ] suffix
              .trim();
            
            console.log('🚨 Cleaned marker:', cleanMarker);
            
            const markerParts = cleanMarker.split(',').map(part => part.trim()).filter(part => part);
            
            markerParts.forEach(markerPart => {
              console.log('🚨 Looking for matches for marker part:', markerPart);
              
              // Try to find a matching image using fuzzy matching
              const matchingImage = uniqueImages.find(img => {
                if (!img.originalMarker) return false;
                
                console.log('🚨   Comparing detected marker "' + markerPart + '" with image marker:', img.originalMarker);
                
                // Handle comma-separated original markers
                const originalParts = img.originalMarker.split(',').map(part => part.trim()).filter(part => part);
                
                // Check if any part matches using fuzzy logic
                const isMatch = originalParts.some(origPart => {
                  const match = fuzzyMatch(markerPart, origPart);
                  console.log(`🚨     Testing: "${markerPart}" vs "${origPart}" = ${match}`);
                  return match;
                });
                
                return isMatch;
              });
              
              if (matchingImage && !matches.find(m => m.imageUrl === matchingImage.url)) {
                console.log('🚨 ✅ FOUND MATCH:', markerPart, '->', matchingImage.originalMarker);
                matches.push({
                  marker: marker,
                  imageUrl: matchingImage.url,
                  description: matchingImage.description
                });
              } else if (!matchingImage) {
                console.log('🚨 ❌ NO MATCH for:', markerPart);
              }
            });
          });
          
          console.log('Auto-match results:', matches);
          console.log('Detected markers:', detectedMarkers);
          console.log('Available images with markers:', uniqueImages.filter(img => img.originalMarker));
          console.log('🔍 DEBUGGING - All available markers in database:', 
            uniqueImages.map(img => img.originalMarker).filter(Boolean));
          console.log('🔍 DEBUGGING - All detected markers from items:', detectedMarkers);
          
          if (matches.length > 0) {
            onAutoMatch(matches);
            toast({
              title: "Auto-match found images!",
              description: `Found ${matches.length} matching images based on marker names`
            });
          } else {
            console.log('🚨 No matches found - this could be because:');
            console.log('🚨 1. Marker names are too different between checklists');
            console.log('🚨 2. Images in database don\'t have marker names stored');
            console.log('🚨 3. The images need to be backfilled first');
          }
        }
      };

      loadImages();
    }
  }, [isOpen, checklists, sourceChecklistType, onAutoMatch, detectedMarkers, organization?.id]);

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