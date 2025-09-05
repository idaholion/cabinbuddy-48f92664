import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon, Check, AlertCircle, X, Database } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ExistingImagesBrowser } from './ExistingImagesBrowser';

interface ImageMarker {
  marker: string;
  filename: string;
  description?: string;
  position: number;
}

interface ImageFile {
  filename: string;
  data: string;
  contentType?: string;
  file?: File;
  isExisting?: boolean;
  url?: string;
  description?: string;
}

interface EnhancedImageUploaderProps {
  detectedMarkers: ImageMarker[];
  onImagesReady: (images: ImageFile[]) => void;
  isProcessing?: boolean;
}

export const EnhancedImageUploader: React.FC<EnhancedImageUploaderProps> = ({
  detectedMarkers,
  onImagesReady,
  isProcessing = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<ImageFile[]>([]);
  const [selectedExistingImages, setSelectedExistingImages] = useState<ImageFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    const newImages: ImageFile[] = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        });
        continue;
      }

      try {
        const base64Data = await convertFileToBase64(file);
        newImages.push({
          filename: file.name,
          data: base64Data,
          contentType: file.type,
          file
        });
      } catch (error) {
        toast({
          title: "Upload Error",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        });
      }
    }

    const updatedFiles = [...uploadedFiles, ...newImages];
    setUploadedFiles(updatedFiles);
    // Combine uploaded and existing images
    onImagesReady([...updatedFiles, ...selectedExistingImages]);

    if (newImages.length > 0) {
      toast({
        title: "Images Uploaded",
        description: `Successfully uploaded ${newImages.length} image(s)`,
      });
    }
  }, [uploadedFiles, onImagesReady]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFileUpload(files);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = (filename: string, isExisting = false) => {
    if (isExisting) {
      const updatedExisting = selectedExistingImages.filter(f => f.filename !== filename);
      setSelectedExistingImages(updatedExisting);
      onImagesReady([...uploadedFiles, ...updatedExisting]);
    } else {
      const updatedFiles = uploadedFiles.filter(f => f.filename !== filename);
      setUploadedFiles(updatedFiles);
      onImagesReady([...updatedFiles, ...selectedExistingImages]);
    }
  };

  const handleExistingImageSelect = (imageUrl: string, description?: string) => {
    // Extract filename from URL or create a unique one
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || `existing-${Date.now()}.jpg`;
    
    // Check if already selected
    if (selectedExistingImages.some(img => img.url === imageUrl)) {
      toast({
        title: "Already Selected",
        description: "This image is already selected",
        variant: "destructive"
      });
      return;
    }

    const existingImage: ImageFile = {
      filename,
      data: imageUrl, // For existing images, we use the URL as data
      isExisting: true,
      url: imageUrl,
      description,
      contentType: 'image/jpeg' // Default type for existing images
    };

    const updatedExisting = [...selectedExistingImages, existingImage];
    setSelectedExistingImages(updatedExisting);
    onImagesReady([...uploadedFiles, ...updatedExisting]);

    toast({
      title: "Image Selected",
      description: "Existing image added to selection",
    });
  };

  // Check which markers have matching files (both uploaded and existing)
  const getMatchingStatus = () => {
    const allImages = [...uploadedFiles, ...selectedExistingImages];
    const matchedCount = detectedMarkers.filter(marker => 
      allImages.some(file => 
        file.filename.toLowerCase().includes(marker.filename.toLowerCase()) ||
        marker.filename.toLowerCase().includes(file.filename.toLowerCase())
      )
    ).length;
    
    return { matchedCount, totalMarkers: detectedMarkers.length };
  };

  const { matchedCount, totalMarkers } = getMatchingStatus();
  const matchPercentage = totalMarkers > 0 ? Math.round((matchedCount / totalMarkers) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Detected Image Markers */}
      {detectedMarkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Detected Image Markers ({detectedMarkers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{matchedCount} of {totalMarkers} images matched</span>
                <Badge variant={matchPercentage === 100 ? "default" : "secondary"}>
                  {matchPercentage}%
                </Badge>
              </div>
              <Progress value={matchPercentage} className="h-2" />
            </div>
            
            <div className="grid gap-2">
              {detectedMarkers.map((marker, index) => {
                const allImages = [...uploadedFiles, ...selectedExistingImages];
                const isMatched = allImages.some(file => 
                  file.filename.toLowerCase().includes(marker.filename.toLowerCase()) ||
                  marker.filename.toLowerCase().includes(file.filename.toLowerCase())
                );
                
                return (
                  <div key={index} className="flex items-center gap-2 p-2 rounded border">
                    {isMatched ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <div className="flex-1">
                      <p className="font-mono text-sm">{marker.filename}</p>
                      {marker.description && (
                        <p className="text-xs text-muted-foreground">{marker.description}</p>
                      )}
                    </div>
                    <Badge variant={isMatched ? "default" : "secondary"}>
                      {isMatched ? "Matched" : "Missing"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Selection Area */}
      <Card>
        <CardHeader>
          <CardTitle>Add Images</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload New
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Browse Library
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 mt-4">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag & drop images here, or click to select
                </p>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                  id="image-upload"
                  disabled={isProcessing}
                />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={isProcessing}>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Images
                  </Button>
                </Label>
              </div>

              {detectedMarkers.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">💡 Image Matching Tips:</p>
                  <ul className="text-sm text-blue-700 mt-1 ml-4 space-y-1">
                    <li>Image filenames should match or contain the names from your document markers</li>
                    <li>For example: <code>[IMAGE:tool1.jpg:Wrench photo]</code> matches <code>tool1.jpg</code> or <code>my_tool1.png</code></li>
                    <li>Case and extension don't matter - <code>Tool1.JPG</code> will match <code>tool1.jpg</code></li>
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="existing" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Browse and select images from your existing checklists to reuse them.
                </p>
                
                <ExistingImagesBrowser
                  onImageSelect={handleExistingImageSelect}
                  currentImages={selectedExistingImages.map(img => img.url || '')}
                  trigger={
                    <Button variant="outline" className="w-full">
                      <Database className="h-4 w-4 mr-2" />
                      Browse Existing Images
                    </Button>
                  }
                />

                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">✨ Reuse Existing Images:</p>
                  <ul className="text-sm text-green-700 mt-1 ml-4 space-y-1">
                    <li>Select images from your closing, opening, or other checklists</li>
                    <li>Reduces storage usage and ensures consistency</li>
                    <li>Images are automatically matched with detected markers</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Combined Images List */}
          {(uploadedFiles.length > 0 || selectedExistingImages.length > 0) && (
            <div className="space-y-2 mt-4">
              <Label>Selected Images ({uploadedFiles.length + selectedExistingImages.length})</Label>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {/* Uploaded Images */}
                {uploadedFiles.map((file, index) => (
                  <div key={`uploaded-${index}`} className="flex items-center gap-2 p-2 rounded border bg-blue-50">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <Badge variant="secondary">New</Badge>
                    <span className="flex-1 text-sm font-mono">{file.filename}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.filename, false)}
                      disabled={isProcessing}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {/* Existing Images */}
                {selectedExistingImages.map((file, index) => (
                  <div key={`existing-${index}`} className="flex items-center gap-2 p-2 rounded border bg-green-50">
                    <ImageIcon className="h-4 w-4 text-green-500" />
                    <Badge variant="default">Library</Badge>
                    <span className="flex-1 text-sm font-mono">{file.filename}</span>
                    {file.description && (
                      <span className="text-xs text-muted-foreground max-w-32 truncate">
                        {file.description}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.filename, true)}
                      disabled={isProcessing}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};