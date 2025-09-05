import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Image as ImageIcon, X } from 'lucide-react';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { toast } from '@/hooks/use-toast';

interface ExistingImagesBrowserProps {
  onImageSelect: (imageUrl: string, description?: string) => void;
  currentImages?: string[];
  trigger?: React.ReactNode;
  sourceChecklistType?: 'closing' | 'opening' | 'seasonal' | 'maintenance';
}

export const ExistingImagesBrowser: React.FC<ExistingImagesBrowserProps> = ({
  onImageSelect,
  currentImages = [],
  trigger,
  sourceChecklistType = 'closing'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableImages, setAvailableImages] = useState<Array<{url: string, description?: string}>>([]);
  const { checklists } = useCustomChecklists();

  useEffect(() => {
    if (isOpen) {
      // Find the source checklist (e.g., closing) and extract images
      const sourceChecklist = checklists.find(c => c.checklist_type === sourceChecklistType);
      if (sourceChecklist && sourceChecklist.images) {
        const images = Array.isArray(sourceChecklist.images) 
          ? sourceChecklist.images.map((img: any) => ({
              url: typeof img === 'string' ? img : img.url,
              description: typeof img === 'object' ? img.description || img.alt : undefined
            }))
          : [];
        setAvailableImages(images);
      } else {
        setAvailableImages([]);
      }
    }
  }, [isOpen, checklists, sourceChecklistType]);

  // Filter images based on search term
  const filteredImages = availableImages.filter(image => 
    !searchTerm || 
    (image.description && image.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    image.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImageSelect = (image: {url: string, description?: string}) => {
    onImageSelect(image.url, image.description);
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