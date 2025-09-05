import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ImageIcon, Search, Trash2, RefreshCw, Upload, Eye, AlertTriangle } from 'lucide-react';
import { useImageLibrary } from '@/hooks/useImageLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageLibraryManagerProps {
  trigger?: React.ReactNode;
}

export const ImageLibraryManager: React.FC<ImageLibraryManagerProps> = ({ trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [imageUsage, setImageUsage] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { 
    images, 
    loading, 
    searchTerm, 
    setSearchTerm, 
    updateUsageCounts,
    getImageUsage,
    replaceImageGlobally,
    deleteImageSafely,
    addImageToLibrary,
    totalImages
  } = useImageLibrary();
  
  const { toast } = useToast();

  const handleViewUsage = async (image: any) => {
    setSelectedImage(image);
    const usage = await getImageUsage(image.image_url);
    setImageUsage(usage);
    setShowUsageDialog(true);
  };

  const handleDeleteClick = async (image: any) => {
    setSelectedImage(image);
    const usage = await getImageUsage(image.image_url);
    setImageUsage(usage);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async (forceDelete = false) => {
    if (!selectedImage) return;
    
    const result = await deleteImageSafely(selectedImage.image_url, forceDelete);
    
    if (result.success) {
      setShowDeleteDialog(false);
      setSelectedImage(null);
    } else if (result.requiresForce && !forceDelete) {
      // Show force delete option
      return;
    }
  };

  const handleReplaceClick = (image: any) => {
    setSelectedImage(image);
    setShowReplaceDialog(true);
  };

  const handleFileReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedImage) return;

    setUploading(true);
    try {
      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `checklist-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('checklist-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('checklist-images')
        .getPublicUrl(filePath);

      // Replace globally
      const result = await replaceImageGlobally(selectedImage.image_url, publicUrl);
      
      if (result.success) {
        // Delete old file from storage
        const oldPath = selectedImage.image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('checklist-images')
            .remove([`checklist-images/${oldPath}`]);
        }
        
        setShowReplaceDialog(false);
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Error replacing image:', error);
      toast({
        title: "Error",
        description: "Failed to replace image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Manage Images ({totalImages})
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Library Manager
              <Badge variant="secondary">{totalImages} images</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images by filename or marker name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={updateUsageCounts}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Counts
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading images...</span>
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No images found</p>
                  {searchTerm && (
                    <p className="text-sm">Try adjusting your search terms</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                  {images.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-video relative">
                        <img
                          src={image.image_url}
                          alt={image.original_filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Badge variant={image.usage_count > 0 ? "default" : "secondary"}>
                            {image.usage_count} uses
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm truncate" title={image.original_filename}>
                          {image.original_filename}
                        </h3>
                        {image.marker_name && (
                          <p className="text-xs text-muted-foreground">
                            Marker: {image.marker_name}
                          </p>
                        )}
                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                          <span>{formatFileSize(image.file_size)}</span>
                          <span>{formatDate(image.created_at)}</span>
                        </div>
                        <div className="flex gap-1 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUsage(image)}
                            className="flex-1 text-xs gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Usage
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReplaceClick(image)}
                            className="flex-1 text-xs gap-1"
                          >
                            <Upload className="h-3 w-3" />
                            Replace
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(image)}
                            className="text-xs gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Usage Details</DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.original_filename}
                  className="w-24 h-24 object-cover rounded"
                />
                <div>
                  <h3 className="font-medium">{selectedImage.original_filename}</h3>
                  <p className="text-sm text-muted-foreground">
                    Used in {imageUsage.length} location(s)
                  </p>
                </div>
              </div>
              
              <ScrollArea className="h-64">
                {imageUsage.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    This image is not currently used in any checklists
                  </p>
                ) : (
                  <div className="space-y-2">
                    {imageUsage.map((usage, index) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{usage.checklist_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {usage.location === 'top_level' ? 'Checklist header' : `Item: ${usage.item_text}`}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {usage.location === 'top_level' ? 'Header' : 'Item'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Image
            </AlertDialogTitle>
            <AlertDialogDescription>
              {imageUsage.length > 0 ? (
                <>
                  This image is currently used in {imageUsage.length} location(s). 
                  Deleting it will remove it from all checklists where it's used.
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </>
              ) : (
                "This image is not currently used in any checklists. Are you sure you want to delete it?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteConfirm(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {imageUsage.length > 0 ? 'Force Delete' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Image</DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.original_filename}
                  className="w-24 h-24 object-cover rounded"
                />
                <div>
                  <h3 className="font-medium">{selectedImage.original_filename}</h3>
                  <p className="text-sm text-muted-foreground">
                    This will replace the image everywhere it's used
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select replacement image:
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileReplace}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Uploading and replacing...
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};