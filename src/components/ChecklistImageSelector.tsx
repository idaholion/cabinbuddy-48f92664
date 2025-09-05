import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Image as ImageIcon, Upload, X } from 'lucide-react';
import { 
  CHECKLIST_IMAGE_LIBRARY, 
  ChecklistImageKey, 
  getAvailableImageKeys, 
  getOptimizedChecklistImage,
  uploadChecklistImage,
  checkImageExists
} from '@/lib/checklist-image-library';
import { toast } from '@/hooks/use-toast';

interface ChecklistImageSelectorProps {
  onImageSelect: (imageUrl: string, key: ChecklistImageKey) => void;
  currentImages?: string[];
  trigger?: React.ReactNode;
}

export const ChecklistImageSelector: React.FC<ChecklistImageSelectorProps> = ({
  onImageSelect,
  currentImages = [],
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState<ChecklistImageKey | null>(null);
  const [existingImages, setExistingImages] = useState<Set<ChecklistImageKey>>(new Set());

  const availableKeys = getAvailableImageKeys();
  
  // Filter images based on search term
  const filteredKeys = availableKeys.filter(key => 
    key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.replace(/-/g, ' ').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group images by category
  const categories = {
    'Water System': filteredKeys.filter(key => key.includes('water') || key.includes('faucet') || key.includes('toilet')),
    'Electrical': filteredKeys.filter(key => key.includes('electrical') || key.includes('breaker') || key.includes('outlet')),
    'HVAC & Heating': filteredKeys.filter(key => key.includes('propane') || key.includes('furnace') || key.includes('thermostat') || key.includes('wood')),
    'Appliances': filteredKeys.filter(key => key.includes('refrigerator') || key.includes('dishwasher') || key.includes('washer') || key.includes('disposal')),
    'Structural': filteredKeys.filter(key => key.includes('dock') || key.includes('deck') || key.includes('gutter') || key.includes('window') || key.includes('roof') || key.includes('foundation')),
    'Security': filteredKeys.filter(key => key.includes('door') || key.includes('lock') || key.includes('alarm') || key.includes('garage')),
    'Outdoor': filteredKeys.filter(key => key.includes('lawn') || key.includes('outdoor') || key.includes('fire') || key.includes('boat')),
    'Safety & Maintenance': filteredKeys.filter(key => key.includes('smoke') || key.includes('carbon') || key.includes('first') || key.includes('tools'))
  };

  const handleImageSelect = (key: ChecklistImageKey) => {
    const imageUrl = CHECKLIST_IMAGE_LIBRARY[key];
    onImageSelect(imageUrl, key);
    setIsOpen(false);
    toast({ title: "Image selected", description: `Added ${key.replace(/-/g, ' ')} image to checklist` });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, key: ChecklistImageKey) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(key);
    try {
      const imageUrl = await uploadChecklistImage(file, key);
      onImageSelect(imageUrl, key);
      setExistingImages(prev => new Set([...prev, key]));
      toast({ title: "Image uploaded", description: `Successfully uploaded ${key.replace(/-/g, ' ')} image` });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ 
        title: "Upload failed", 
        description: "Failed to upload image. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setUploading(null);
    }
  };

  const isImageSelected = (key: ChecklistImageKey) => {
    return currentImages.includes(CHECKLIST_IMAGE_LIBRARY[key]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            Add Shared Image
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Shared Checklist Image Library</DialogTitle>
          <DialogDescription>
            Select from pre-defined images to ensure consistency across opening and closing checklists.
            This optimizes memory usage by reusing the same image URLs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search images by category or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-6">
              {Object.entries(categories).map(([categoryName, keys]) => {
                if (keys.length === 0) return null;
                
                return (
                  <div key={categoryName}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background z-10">
                      {categoryName}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {keys.map((key) => {
                        const optimizedImage = getOptimizedChecklistImage(key);
                        const selected = isImageSelected(key);
                        const isUploading = uploading === key;
                        
                        return (
                          <div 
                            key={key} 
                            className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                              selected 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {/* Image Preview */}
                            <div className="aspect-square bg-muted relative">
                              <img
                                src={optimizedImage.src}
                                alt={optimizedImage.alt}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  // Hide broken images and show upload option
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              
                              {/* Upload overlay for missing images */}
                              <label className="absolute inset-0 flex items-center justify-center bg-muted/90 cursor-pointer">
                                <div className="text-center">
                                  {isUploading ? (
                                    <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent mx-auto" />
                                  ) : (
                                    <>
                                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                      <p className="text-xs text-muted-foreground">Upload</p>
                                    </>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => handleFileUpload(e, key)}
                                  disabled={isUploading}
                                />
                              </label>
                            </div>
                            
                            {/* Selection overlay */}
                            <div 
                              className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all flex items-center justify-center"
                              onClick={() => handleImageSelect(key)}
                            >
                              {selected && (
                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                  <X className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            
                            {/* Label */}
                            <div className="p-2 bg-background">
                              <p className="text-xs font-medium truncate">
                                {key.replace(/-/g, ' ')}
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
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};