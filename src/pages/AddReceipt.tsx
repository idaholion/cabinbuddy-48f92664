import { useState, useMemo } from "react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Camera, DollarSign, Trash2, Home, Receipt, Image, Smartphone, Loader2, ZoomIn, ZoomOut, RotateCcw, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { useReceipts } from "@/hooks/useReceipts";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedProfileClaim } from "@/hooks/useEnhancedProfileClaim";

const AddReceipt = () => {
  const { receipts, loading, createReceipt, deleteReceipt, refetchReceipts } = useReceipts();
  const { familyGroups } = useFamilyGroups();
  const { claimedProfile } = useEnhancedProfileClaim();
  const [amount, setAmount] = useState("");
  const [uploadAmount, setUploadAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    originalSize?: number;
    dimensions: { width: number; height: number } | null;
  } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editingReceipt, setEditingReceipt] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { toast } = useToast();
  const [uploadDescription, setUploadDescription] = useState("");

  // Quality options
  const qualityOptions = {
    high: { maxWidth: 2400, maxHeight: 1600, quality: 0.95, label: "High Quality", description: "Best quality, larger file size" },
    balanced: { maxWidth: 1920, maxHeight: 1080, quality: 0.8, label: "Balanced", description: "Good quality, moderate file size" },
    small: { maxWidth: 1280, maxHeight: 720, quality: 0.6, label: "Small File", description: "Lower quality, smallest file size" }
  };

  // Filter receipts by selected family group
  const filteredReceipts = useMemo(() => {
    if (selectedFamilyGroup === "all") {
      return receipts;
    }
    return receipts.filter(receipt => receipt.family_group === selectedFamilyGroup);
  }, [receipts, selectedFamilyGroup]);

  // Image compression/resizing function
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

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processImageWithQuality = async (file: File, qualityKey: keyof typeof qualityOptions) => {
    const options = qualityOptions[qualityKey];
    const processedFile = await compressImage(file, options.maxWidth, options.maxHeight, options.quality);
    
    // Get file info
    const dimensions = await getImageDimensions(processedFile);
    setFileInfo({
      name: processedFile.name,
      size: processedFile.size,
      originalSize: file.size !== processedFile.size ? file.size : undefined,
      dimensions
    });

    return processedFile;
  };

  const handleQualitySelection = async (qualityKey: keyof typeof qualityOptions) => {
    if (!pendingFile) return;

    setShowQualityDialog(false);
    toast({
      title: "Processing image...",
      description: `Optimizing image with ${qualityOptions[qualityKey].label.toLowerCase()} settings.`,
    });

    const processedFile = await processImageWithQuality(pendingFile, qualityKey);

    if (uploadAmount) {
      setUploadingFile(true);
      try {
        await createReceipt({
          amount: parseFloat(uploadAmount),
          description: uploadDescription || `Receipt uploaded: ${processedFile.name}`,
          date: new Date().toISOString().split('T')[0],
          image: processedFile,
          family_group: claimedProfile?.family_group_name
        });
        setUploadAmount("");
        setUploadDescription("");
        setFileInfo(null);
        toast({
          title: "Receipt uploaded",
          description: `${processedFile.name} has been uploaded successfully.`,
        });
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploadingFile(false);
      }
    } else {
      setCurrentFile(processedFile);
      toast({
        title: "File processed",
        description: `${processedFile.name} processed. Please enter amount to upload.`,
      });
    }

    setPendingFile(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an image that might benefit from quality selection
      if (file.type.startsWith('image/') && file.size > 500 * 1024) { // > 500KB
        setPendingFile(file);
        setShowQualityDialog(true);
        event.target.value = "";
        return;
      }

      // For small images or non-images, process normally
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        const dimensions = await getImageDimensions(file);
        setFileInfo({
          name: file.name,
          size: file.size,
          dimensions
        });
      }

      if (uploadAmount) {
        setUploadingFile(true);
        try {
          await createReceipt({
            amount: parseFloat(uploadAmount),
            description: uploadDescription || `Receipt uploaded: ${processedFile.name}`,
            date: new Date().toISOString().split('T')[0],
            image: processedFile,
            family_group: claimedProfile?.family_group_name
          });
          setUploadAmount("");
          setUploadDescription("");
          setFileInfo(null);
          event.target.value = "";
          toast({
            title: "Receipt uploaded",
            description: `${processedFile.name} has been uploaded successfully.`,
          });
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploadingFile(false);
        }
      } else {
        setCurrentFile(processedFile);
        toast({
          title: "File selected",
          description: `${processedFile.name} selected. Please enter amount to upload.`,
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      
      // Check if it's an image that might benefit from quality selection
      if (file.type.startsWith('image/') && file.size > 500 * 1024) { // > 500KB
        setPendingFile(file);
        setShowQualityDialog(true);
        return;
      }
      
      // For small images or non-images, process normally
      const dimensions = file.type.startsWith('image/') ? await getImageDimensions(file) : null;
      setFileInfo({
        name: file.name,
        size: file.size,
        dimensions
      });

      if (uploadAmount) {
        setUploadingFile(true);
        try {
          await createReceipt({
            amount: parseFloat(uploadAmount),
            description: uploadDescription || `Receipt uploaded: ${file.name}`,
            date: new Date().toISOString().split('T')[0],
            image: file,
            family_group: claimedProfile?.family_group_name
          });
          setUploadAmount("");
          setUploadDescription("");
          setFileInfo(null);
          toast({
            title: "Receipt uploaded",
            description: `${file.name} has been uploaded successfully.`,
          });
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploadingFile(false);
        }
      } else {
        setCurrentFile(file);
        toast({
          title: "File dropped",
          description: `${file.name} dropped. Please enter amount to upload.`,
        });
      }
    }
  };

  const handleNativePhotoSelection = async (source: CameraSource, quality = 90) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: quality,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });
      
      if (image.dataUrl && uploadAmount) {
        setUploadingFile(true);
        try {
          // Convert data URL to File object
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          await createReceipt({
            amount: parseFloat(uploadAmount),
            description: uploadDescription || `Receipt photo ${source === CameraSource.Camera ? 'taken' : 'selected'}`,
            date: new Date().toISOString().split('T')[0],
            image: file,
            family_group: claimedProfile?.family_group_name
          });
          
          setUploadAmount("");
          setUploadDescription("");
          toast({
            title: "Receipt captured",
            description: `Receipt photo has been ${source === CameraSource.Camera ? 'taken' : 'selected'} and uploaded successfully.`,
          });
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploadingFile(false);
        }
      } else if (image.dataUrl) {
        // Convert data URL to File object and store for later
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Get file info
        const dimensions = await getImageDimensions(file);
        setFileInfo({
          name: file.name,
          size: file.size,
          dimensions
        });
        
        setCurrentFile(file);
        toast({
          title: "Photo captured",
          description: "Photo captured. Please enter amount to upload.",
        });
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      toast({
        title: "Photo selection failed",
        description: "Unable to access camera or photo library.",
        variant: "destructive"
      });
    }
  };

  const handleTakePicture = () => {
    // Show quality dialog for camera photos too
    setPendingFile(null); // Special flag for camera
    setShowQualityDialog(true);
  };

  const handleCameraWithQuality = (qualityKey: keyof typeof qualityOptions) => {
    const qualityMap = { high: 95, balanced: 85, small: 70 };
    handleNativePhotoSelection(CameraSource.Camera, qualityMap[qualityKey]);
    setShowQualityDialog(false);
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const resetImageView = () => {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description) {
      try {
        await createReceipt({
          amount: parseFloat(amount),
          description,
          date: new Date().toISOString().split('T')[0],
          family_group: claimedProfile?.family_group_name
        });
        setAmount("");
        setDescription("");
      } catch (error) {
        console.error('Manual receipt creation failed:', error);
      }
    }
  };

  const handleDeleteReceipt = (id: string) => {
    deleteReceipt(id);
  };

  const handleEditReceipt = (id: string, currentAmount: number) => {
    setEditingReceipt(id);
    setEditAmount(currentAmount.toString());
  };

  const handleSaveAmount = async (id: string) => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('receipts')
        .update({ amount: parseFloat(editAmount) })
        .eq('id', id);

      if (error) throw error;

      // Update local state by refetching receipts to ensure consistency
      await refetchReceipts();
      
      toast({
        title: "Amount updated",
        description: "Receipt amount has been updated successfully.",
      });

      setEditingReceipt(null);
      setEditAmount("");
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast({
        title: "Update failed",
        description: "Failed to update receipt amount.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingReceipt(null);
    setEditAmount("");
  };

  const handleUploadWithAmount = async () => {
    if (currentFile && uploadAmount) {
      setUploadingFile(true);
      try {
        await createReceipt({
          amount: parseFloat(uploadAmount),
          description: uploadDescription || `Receipt uploaded: ${currentFile.name}`,
          date: new Date().toISOString().split('T')[0],
          image: currentFile,
          family_group: claimedProfile?.family_group_name
        });
        setUploadAmount("");
        setUploadDescription("");
        setCurrentFile(null);
        setFileInfo(null);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploadingFile(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-4 md:mb-8">
          <h1 className="text-heading-primary mb-2 md:mb-4 font-kaushan text-primary drop-shadow-lg text-center flex items-center justify-center">
            <Receipt className="h-6 w-6 md:h-10 md:w-10 mr-2 md:mr-3" />
            Add Receipt
          </h1>
          <div className="relative flex items-center justify-center">
            <p className="text-body-large text-primary text-center font-medium">Upload and manage cabin expense receipts</p>
            <div className="absolute -left-16">
              <NavigationHeader className="mb-0" />
            </div>
          </div>
        </div>
        
        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Receipt Section - Left Column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Receipt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-label">Choose Photo Source</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleNativePhotoSelection(CameraSource.Photos)}
                      className="flex flex-col items-center space-y-2 h-auto py-4 hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200"
                    >
                      <Image className="h-6 w-6" />
                      <span className="text-body">Photo Library</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleNativePhotoSelection(CameraSource.Camera)}
                      className="flex flex-col items-center space-y-2 h-auto py-4 hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200"
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-body">Take Photo</span>
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-body uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer text-label">
                    <Button asChild className="w-full hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200" variant="outline">
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-body text-muted-foreground">
                    Drag and drop your receipt here
                  </p>
                  <p className="text-body text-muted-foreground mt-1">
                  Supports images and PDF files
                </p>
              </div>

              <div>
                <Label htmlFor="upload-description" className="text-label">Description</Label>
                <Textarea
                  id="upload-description"
                  placeholder="Enter receipt description..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  className="text-body placeholder:text-body"
                />
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="upload-amount" className="text-label">Receipt Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="upload-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={uploadAmount}
                      onChange={(e) => setUploadAmount(e.target.value)}
                      className="flex-1 text-body placeholder:text-body"
                    />
                    {currentFile && uploadAmount && (
                      <Button 
                        onClick={handleUploadWithAmount}
                        disabled={uploadingFile}
                        className="flex items-center space-x-2 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none"
                      >
                        {uploadingFile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{uploadingFile ? 'Uploading...' : 'Upload'}</span>
                      </Button>
                    )}
                  </div>
                  {fileInfo && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm border">
                      <p className="font-medium text-foreground">{fileInfo.name}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-muted-foreground">Size: {formatFileSize(fileInfo.size)}</span>
                        {fileInfo.dimensions && (
                          <span className="text-muted-foreground">
                            {fileInfo.dimensions.width} × {fileInfo.dimensions.height}px
                          </span>
                        )}
                      </div>
                      {fileInfo.size > 5 * 1024 * 1024 && (
                        <div className="flex items-center gap-1 mt-2 text-amber-600">
                          <span className="text-xs">⚠️</span>
                          <span className="text-xs">Large file - consider resizing</span>
                        </div>
                      )}
                      {fileInfo.originalSize && fileInfo.size < fileInfo.originalSize && (
                        <div className="flex items-center gap-1 mt-1 text-green-600">
                          <span className="text-xs">✓</span>
                          <span className="text-xs">Compressed from {formatFileSize(fileInfo.originalSize)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry Section - Middle Column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Manual Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-label">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="text-body placeholder:text-body"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-label">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter receipt description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="text-body placeholder:text-body"
                  />
                </div>
                
                <Button type="submit" className="w-full hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200">
                  Add Receipt Manually
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Receipt List Section - Right Column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Receipt List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Family Group Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="family-filter" className="whitespace-nowrap text-sm">Filter:</Label>
                <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                  <SelectTrigger id="family-filter" className="w-[200px]">
                    <SelectValue placeholder="Select family group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Family Groups</SelectItem>
                    {familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {filteredReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 relative">
                      {receipt.image_url ? (
                        <img 
                          src={receipt.image_url} 
                          alt="Receipt thumbnail"
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewingImage(receipt.image_url)}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium truncate">{receipt.description}</p>
                        <div className="flex items-center gap-2">
                          {editingReceipt === receipt.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-body">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-20 h-6 text-sm"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveAmount(receipt.id)}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <p className="text-body-large font-bold text-primary">${receipt.amount.toFixed(2)}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditReceipt(receipt.id, receipt.amount)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-body-small text-muted-foreground">
                          {new Date(receipt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-110 hover:shadow-md hover:shadow-destructive/20 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredReceipts.length === 0 && receipts.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground text-body">
                      No receipts found for selected family group
                    </div>
                  )}
                  {receipts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-body">
                      No receipts added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="mt-4 pt-4 border-t space-y-1">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredReceipts.length} of {receipts.length} receipts
                </div>
                <div className="flex justify-between items-center font-bold text-body-large">
                  <span>Total:</span>
                  <span className="text-primary">
                    ${receipts.reduce((sum, receipt) => sum + receipt.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Viewing Modal with Zoom and Pan */}
      <Dialog open={!!viewingImage} onOpenChange={() => { setViewingImage(null); resetImageView(); }}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Receipt Image
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newZoom = Math.max(0.25, imageZoom - 0.25);
                    setImageZoom(newZoom);
                    if (newZoom === 1) setImagePan({ x: 0, y: 0 });
                  }}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-mono min-w-[50px] text-center">{Math.round(imageZoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.min(4, imageZoom + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImageView}
                  title="Reset zoom and position"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="relative overflow-hidden max-h-[75vh] bg-muted/10 rounded-lg">
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ minHeight: '60vh' }}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseUp}
              >
                <img 
                  src={viewingImage} 
                  alt="Full size receipt" 
                  className={`max-w-none rounded-lg select-none ${imageZoom > 1 ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
                  style={{ 
                    transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease'
                  }}
                  onMouseDown={handleImageMouseDown}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    const newZoom = Math.max(0.25, Math.min(4, imageZoom + delta));
                    setImageZoom(newZoom);
                    if (newZoom === 1) setImagePan({ x: 0, y: 0 });
                  }}
                  draggable={false}
                />
              </div>
              {imageZoom > 1 && (
                <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm text-muted-foreground">
                  Click and drag to pan around the image
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quality Selection Dialog */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Image Quality</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pendingFile ? 'Select image quality for upload' : 'Select camera quality for photo'}
            </p>
            <div className="space-y-3">
              {(Object.keys(qualityOptions) as Array<keyof typeof qualityOptions>).map((key) => {
                const option = qualityOptions[key];
                return (
                  <Button
                    key={key}
                    variant="outline"
                    className="w-full justify-start text-left h-auto p-4"
                    onClick={() => pendingFile ? handleQualitySelection(key) : handleCameraWithQuality(key)}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddReceipt;