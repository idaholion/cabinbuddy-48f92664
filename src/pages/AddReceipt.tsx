import { useState, useMemo, useRef, useEffect } from "react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Camera, DollarSign, Trash2, Home, Receipt, Image as ImageIcon, Smartphone, Loader2, ZoomIn, ZoomOut, RotateCcw, Edit2, Check, X, ChevronUp, ChevronDown } from "lucide-react";
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
  // Edit Receipt Dialog state
  const [editingReceiptFull, setEditingReceiptFull] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: '',
    amount: '',
    newImage: null as File | null,
    newImagePreview: null as string | null,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { toast } = useToast();

  // Generate preview URL when currentFile changes
  useEffect(() => {
    if (currentFile) {
      const url = URL.createObjectURL(currentFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [currentFile]);
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

  // Scroll control for receipts list
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollUp = () => {
    const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

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

  // Edit Receipt Dialog handlers
  const openEditDialog = (receipt: any) => {
    setEditingReceiptFull(receipt);
    setEditFormData({
      description: receipt.description,
      amount: receipt.amount.toString(),
      newImage: null,
      newImagePreview: null,
    });
    setShowDeleteConfirm(false);
  };

  const closeEditDialog = () => {
    // Cleanup preview URL if it exists
    if (editFormData.newImagePreview) {
      URL.revokeObjectURL(editFormData.newImagePreview);
    }
    setEditingReceiptFull(null);
    setEditFormData({
      description: '',
      amount: '',
      newImage: null,
      newImagePreview: null,
    });
    setShowDeleteConfirm(false);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cleanup old preview URL
      if (editFormData.newImagePreview) {
        URL.revokeObjectURL(editFormData.newImagePreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setEditFormData(prev => ({
        ...prev,
        newImage: file,
        newImagePreview: previewUrl,
      }));
    }
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const clearNewImage = () => {
    if (editFormData.newImagePreview) {
      URL.revokeObjectURL(editFormData.newImagePreview);
    }
    setEditFormData(prev => ({
      ...prev,
      newImage: null,
      newImagePreview: null,
    }));
  };

  const handleSaveReceipt = async () => {
    if (!editingReceiptFull) return;
    
    if (!editFormData.description.trim()) {
      toast({
        title: "Invalid description",
        description: "Description cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    const parsedAmount = parseFloat(editFormData.amount);
    if (!editFormData.amount || parsedAmount <= 0 || isNaN(parsedAmount)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setSavingEdit(true);
    
    try {
      let imageUrl = editingReceiptFull.image_url;
      
      // If new image selected, upload it
      if (editFormData.newImage) {
        // Get user ID for storage path
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        // Upload new image
        const fileExt = editFormData.newImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipt-images')
          .upload(filePath, editFormData.newImage);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('receipt-images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
        
        // Delete old image if it existed
        if (editingReceiptFull.image_url) {
          try {
            // Extract path from URL
            const oldUrl = new URL(editingReceiptFull.image_url);
            const pathMatch = oldUrl.pathname.match(/receipt-images\/(.+)$/);
            if (pathMatch) {
              await supabase.storage.from('receipt-images').remove([pathMatch[1]]);
            }
          } catch (e) {
            // Ignore errors when deleting old image
            console.warn('Could not delete old image:', e);
          }
        }
      }
      
      // Update receipt in database
      const { error } = await supabase
        .from('receipts')
        .update({
          description: editFormData.description.trim(),
          amount: parsedAmount,
          image_url: imageUrl,
        })
        .eq('id', editingReceiptFull.id);
        
      if (error) throw error;
      
      await refetchReceipts();
      
      toast({
        title: "Receipt updated",
        description: "Receipt has been updated successfully.",
      });
      
      closeEditDialog();
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast({
        title: "Update failed",
        description: "Failed to update receipt.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFromDialog = async () => {
    if (!editingReceiptFull) return;
    await handleDeleteReceipt(editingReceiptFull.id);
    closeEditDialog();
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
                      <ImageIcon className="h-6 w-6" />
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
                    {currentFile && (
                      <Button 
                        onClick={handleUploadWithAmount}
                        disabled={uploadingFile || !uploadAmount}
                        className="flex items-center space-x-2 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none disabled:opacity-50"
                      >
                        {uploadingFile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{uploadingFile ? 'Saving...' : 'Save Receipt'}</span>
                      </Button>
                    )}
                  </div>
                  {currentFile && !uploadAmount && (
                    <p className="text-xs text-muted-foreground mt-1">Enter receipt amount to save</p>
                  )}
                  {fileInfo && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm border">
                      <div className="flex items-start gap-3">
                        {/* Image preview thumbnail */}
                        {previewUrl && (
                          <div className="flex-shrink-0">
                            <img 
                              src={previewUrl} 
                              alt="Receipt preview"
                              className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity border border-border"
                              onClick={() => setViewingImage(previewUrl)}
                            />
                            <p className="text-xs text-muted-foreground text-center mt-1">Click to view</p>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-foreground truncate">{fileInfo.name}</p>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => {
                                setCurrentFile(null);
                                setFileInfo(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
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
                      </div>
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
              
              {/* Scroll Up Button */}
              <div className="flex justify-center mb-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={scrollUp}
                  className="rounded-full hover:bg-primary hover:text-primary-foreground transition-all shadow-md"
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
              </div>

              <div ref={scrollContainerRef}>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                  {filteredReceipts.map((receipt) => (
                    <div key={receipt.id} className="p-3 border rounded-lg hover:bg-muted/50 space-y-2">
                      {/* Description - full width at top */}
                      <p className="text-sm font-medium break-words whitespace-pre-wrap">{receipt.description}</p>
                      
                      {/* Bottom row: thumbnail, amount/date, edit button */}
                      <div className="flex items-center gap-3">
                        {receipt.image_url ? (
                          <img 
                            src={receipt.image_url} 
                            alt="Receipt thumbnail"
                            className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                            onClick={() => setViewingImage(receipt.image_url)}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-primary">${receipt.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(receipt)}
                          className="text-muted-foreground hover:text-primary flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              </div>

              {/* Scroll Down Button */}
              <div className="flex justify-center mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={scrollDown}
                  className="rounded-full hover:bg-primary hover:text-primary-foreground transition-all shadow-md"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t space-y-1">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredReceipts.length} of {receipts.length} receipts
                </div>
                <div className="flex justify-between items-center font-bold text-body-large">
                  <span>Total:</span>
                  <span className="text-primary">
                    ${filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0).toFixed(2)}
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

      {/* Edit Receipt Dialog */}
      <Dialog open={!!editingReceiptFull} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="space-y-2">
              <Label>Receipt Image</Label>
              <div className="relative">
                {(editFormData.newImagePreview || editingReceiptFull?.image_url) ? (
                  <img 
                    src={editFormData.newImagePreview || editingReceiptFull?.image_url}
                    alt="Receipt"
                    className="w-full h-48 object-contain rounded border cursor-pointer bg-muted/20"
                    onClick={() => setViewingImage(editFormData.newImagePreview || editingReceiptFull?.image_url)}
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded flex items-center justify-center border">
                    <Receipt className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Replace Image Button */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => editImageInputRef.current?.click()}
                  type="button"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {editFormData.newImage ? 'Choose Different' : 'Replace Image'}
                </Button>
                {editFormData.newImage && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearNewImage}
                    type="button"
                  >
                    <X className="h-4 w-4 mr-1" /> 
                    Undo
                  </Button>
                )}
              </div>
              <input 
                type="file" 
                ref={editImageInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleEditImageSelect} 
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({...prev, description: e.target.value}))}
                className="min-h-[80px]"
              />
            </div>
            
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">$</span>
                <Input 
                  id="edit-amount"
                  type="number" 
                  step="0.01"
                  min="0"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData(prev => ({...prev, amount: e.target.value}))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-3 sm:flex-row">
            {/* Delete with Confirmation */}
            {!showDeleteConfirm ? (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)} 
                className="sm:mr-auto"
                disabled={savingEdit}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Receipt
              </Button>
            ) : (
              <div className="flex items-center gap-2 sm:mr-auto">
                <span className="text-sm text-destructive font-medium">Delete this receipt?</span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteFromDialog}
                  disabled={savingEdit}
                >
                  Yes
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={savingEdit}
                >
                  No
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={closeEditDialog}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveReceipt}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddReceipt;