import { useState } from "react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Heart, MessageCircle, Share2, ArrowLeft, Calendar, User, Trash2, Image, Smartphone, Download, CheckSquare, Square, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { usePhotos } from "@/hooks/usePhotos";
import { useAuth } from "@/contexts/AuthContext";

export default function PhotoSharing() {
  const { photos, loading, uploadPhoto, likePhoto, deletePhoto } = usePhotos();
  const { user } = useAuth();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({
    caption: "",
    file: null as File | null
  });
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<any | null>(null);

  // Quality options for image compression
  const qualityOptions = {
    high: { maxWidth: 2400, maxHeight: 1600, quality: 0.95, label: "High Quality", description: "Best quality, larger file size" },
    balanced: { maxWidth: 1920, maxHeight: 1080, quality: 0.8, label: "Balanced", description: "Good quality, moderate file size" },
    small: { maxWidth: 1280, maxHeight: 720, quality: 0.6, label: "Small File", description: "Lower quality, smallest file size" }
  };

  // Image compression function
  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        }, 'image/jpeg', quality);
        
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if it's a large image that might benefit from quality selection
      if (file.type.startsWith('image/') && file.size > 100 * 1024) { // > 100KB (lowered threshold)
        setPendingFile(file);
        setShowQualityDialog(true);
        e.target.value = "";
        return;
      }
      
      // For small images, use directly
      setNewPhoto({ ...newPhoto, file });
    }
  };

  const handleQualitySelection = async (qualityKey: keyof typeof qualityOptions) => {
    if (!pendingFile) return;

    setShowQualityDialog(false);
    const options = qualityOptions[qualityKey];
    
    try {
      const processedFile = await compressImage(pendingFile, options.maxWidth, options.maxHeight, options.quality);
      setNewPhoto({ ...newPhoto, file: processedFile });
      setPendingFile(null);
    } catch (error) {
      console.error('Error processing image:', error);
      setPendingFile(null);
    }
  };

  const handleNativePhotoSelection = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });
      
      if (image.dataUrl) {
        // Convert data URL to File object for consistency with existing upload logic
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Check if it's a large image that might benefit from quality selection
        if (file.size > 100 * 1024) { // > 100KB (lowered threshold)
          setPendingFile(file);
          setShowQualityDialog(true);
        } else {
          setNewPhoto({ ...newPhoto, file });
        }
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
    }
  };

  const handleUpload = async () => {
    if (newPhoto.file) {
      setUploading(true);
      try {
        await uploadPhoto(newPhoto.file, newPhoto.caption || "");
        setNewPhoto({ caption: "", file: null });
        setIsUploadOpen(false);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLike = (photoId: string) => {
    likePhoto(photoId);
  };

  const handleDelete = (photoId: string) => {
    deletePhoto(photoId);
  };

  const handleDownload = async (photo: any) => {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = photo.caption 
        ? `${photo.caption.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${photo.created_at}.jpg`
        : `photo_${photo.created_at}.jpg`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  const handleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(photo => photo.id)));
    }
  };

  const handleDownloadSelected = async () => {
    const selectedPhotoList = photos.filter(photo => selectedPhotos.has(photo.id));
    for (const photo of selectedPhotoList) {
      await handleDownload(photo);
      // Add a small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedPhotos(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          title="Family Photo Gallery"
          subtitle="Share your cabin memories with family"
          icon={Camera}
        >
          <NavigationHeader />
        </PageHeader>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              onClick={toggleSelectionMode}
              className="flex items-center space-x-2"
            >
              <CheckSquare className="h-4 w-4" />
              <span>{isSelectionMode ? "Cancel Selection" : "Select Photos"}</span>
            </Button>
            {isSelectionMode && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2"
                >
                  <Square className="h-4 w-4" />
                  <span>{selectedPhotos.size === photos.length ? "Deselect All" : "Select All"}</span>
                </Button>
                {selectedPhotos.size > 0 && (
                  <Button
                    onClick={handleDownloadSelected}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Selected ({selectedPhotos.size})</span>
                  </Button>
                )}
              </>
            )}
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Camera className="h-4 w-4" />
                <span>Upload Photo</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Photo</DialogTitle>
                <DialogDescription>
                  Share a new memory with your family
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Choose Photo Source</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleNativePhotoSelection(CameraSource.Photos)}
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                    >
                      <Image className="h-6 w-6" />
                      <span className="text-sm">Photo Library</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleNativePhotoSelection(CameraSource.Camera)}
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-sm">Take Photo</span>
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-2"
                  />
                </div>
                {newPhoto.file && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {newPhoto.file.name}
                  </div>
                )}
                <div>
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea
                    id="caption"
                    placeholder="Write a caption for your photo... (optional)"
                    value={newPhoto.caption}
                    onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!newPhoto.file || uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Quality Selection Dialog */}
          <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Choose Image Quality</DialogTitle>
                <DialogDescription>
                  This image is large ({pendingFile ? Math.round(pendingFile.size / 1024 / 1024 * 100) / 100 : 0}MB). Select compression quality:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {(Object.keys(qualityOptions) as Array<keyof typeof qualityOptions>).map((key) => {
                  const option = qualityOptions[key];
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-4"
                      onClick={() => handleQualitySelection(key)}
                    >
                      <div className="flex flex-col items-start">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Max: {option.maxWidth}×{option.maxHeight}px, Quality: {Math.round(option.quality * 100)}%
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          {/* Photo Viewer Dialog */}
          <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
              {viewingPhoto && (
                <div className="relative">
                  <img
                    src={viewingPhoto.image_url}
                    alt={viewingPhoto.caption}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(viewingPhoto)}
                      className="bg-black/50 hover:bg-black/70 text-white"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {user?.id === viewingPhoto.user_id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          handleDelete(viewingPhoto.id);
                          setViewingPhoto(null);
                        }}
                        className="bg-red-500/80 hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="p-4 bg-background/95 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${viewingPhoto.user_id}`} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {viewingPhoto.user_id === user?.id ? 'You' : 'Family Member'}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(viewingPhoto.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {viewingPhoto.caption && <p className="text-sm mb-3">{viewingPhoto.caption}</p>}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(viewingPhoto.id)}
                        className={`flex items-center gap-1 ${
                          viewingPhoto.liked_by_users?.includes(user?.id || '') 
                            ? 'text-red-500' 
                            : 'text-muted-foreground hover:text-red-500'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${
                          viewingPhoto.liked_by_users?.includes(user?.id || '') ? 'fill-current' : ''
                        }`} />
                        <span className="text-xs">{viewingPhoto.likes_count}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs">0</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden bg-card/95 hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden relative">
                {isSelectionMode && (
                  <Button
                    variant={selectedPhotos.has(photo.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectPhoto(photo.id)}
                    className="absolute top-2 left-2 h-8 w-8 p-0 z-10"
                  >
                    {selectedPhotos.has(photo.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <img
                  src={photo.image_url}
                  alt={photo.caption}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setViewingPhoto(photo)}
                />
                {user?.id === photo.user_id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(photo.id)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 opacity-80 hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${photo.user_id}`} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {photo.user_id === user?.id ? 'You' : 'Family Member'}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(photo.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {photo.caption && <p className="text-sm text-foreground mb-3">{photo.caption}</p>}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(photo.id)}
                      className={`flex items-center space-x-1 ${
                        photo.liked_by_users?.includes(user?.id || '') 
                          ? 'text-red-500' 
                          : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${
                        photo.liked_by_users?.includes(user?.id || '') ? 'fill-current' : ''
                      }`} />
                      <span className="text-xs">{photo.likes_count}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1 text-muted-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">0</span>
                    </Button>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownload(photo)}
                      className="text-muted-foreground hover:text-primary"
                      title="Download photo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to share a cabin memory!</p>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Camera className="h-4 w-4 mr-2" />
              Upload First Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}