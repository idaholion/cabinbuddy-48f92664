import { useState } from "react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Camera, DollarSign, Trash2, Home, Receipt, Image, Smartphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { useReceipts } from "@/hooks/useReceipts";

const AddReceipt = () => {
  const { receipts, loading, createReceipt, deleteReceipt } = useReceipts();
  const [amount, setAmount] = useState("");
  const [uploadAmount, setUploadAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && uploadAmount) {
      setUploadingFile(true);
      try {
        await createReceipt({
          amount: parseFloat(uploadAmount),
          description: `Receipt uploaded: ${file.name}`,
          date: new Date().toISOString().split('T')[0],
          image: file
        });
        setUploadAmount("");
        event.target.value = "";
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
      setCurrentFile(file || null);
      toast({
        title: "File selected",
        description: `${file?.name} selected. Please enter amount to upload.`,
      });
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
    if (files.length > 0 && uploadAmount) {
      setUploadingFile(true);
      try {
        await createReceipt({
          amount: parseFloat(uploadAmount),
          description: `Receipt uploaded: ${files[0].name}`,
          date: new Date().toISOString().split('T')[0],
          image: files[0]
        });
        setUploadAmount("");
        toast({
          title: "Receipt uploaded",
          description: `${files[0].name} has been uploaded successfully.`,
        });
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploadingFile(false);
      }
    } else {
      setCurrentFile(files[0] || null);
      toast({
        title: "File dropped",
        description: `${files[0]?.name} dropped. Please enter amount to upload.`,
      });
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
      
      if (image.dataUrl && uploadAmount) {
        setUploadingFile(true);
        try {
          // Convert data URL to File object
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          await createReceipt({
            amount: parseFloat(uploadAmount),
            description: `Receipt photo ${source === CameraSource.Camera ? 'taken' : 'selected'}`,
            date: new Date().toISOString().split('T')[0],
            image: file
          });
          
          setUploadAmount("");
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
    handleNativePhotoSelection(CameraSource.Camera);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description) {
      try {
        await createReceipt({
          amount: parseFloat(amount),
          description,
          date: new Date().toISOString().split('T')[0]
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

  const handleUploadWithAmount = async () => {
    if (currentFile && uploadAmount) {
      setUploadingFile(true);
      try {
        await createReceipt({
          amount: parseFloat(uploadAmount),
          description: `Receipt uploaded: ${currentFile.name}`,
          date: new Date().toISOString().split('T')[0],
          image: currentFile
        });
        setUploadAmount("");
        setCurrentFile(null);
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
          <h1 className="text-4xl md:text-6xl mb-2 md:mb-4 font-kaushan text-primary drop-shadow-lg text-center flex items-center justify-center">
            <Receipt className="h-6 w-6 md:h-10 md:w-10 mr-2 md:mr-3" />
            Add Receipt
          </h1>
          <div className="relative flex items-center justify-center">
            <p className="text-lg md:text-2xl text-primary text-center font-medium">Upload and manage cabin expense receipts</p>
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
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button asChild className="w-full" variant="outline">
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
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your receipt here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports images and PDF files
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Label htmlFor="upload-amount">Receipt Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="upload-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={uploadAmount}
                      onChange={(e) => setUploadAmount(e.target.value)}
                      className="flex-1"
                    />
                    {currentFile && uploadAmount && (
                      <Button 
                        onClick={handleUploadWithAmount}
                        disabled={uploadingFile}
                        className="flex items-center space-x-2"
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
                  {currentFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      File ready: {currentFile.name}
                    </p>
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
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter receipt description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                  />
                </div>
                
                <Button type="submit" className="w-full">
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
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 relative">
                      {receipt.image_url ? (
                        <img 
                          src={receipt.image_url} 
                          alt="Receipt thumbnail"
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{receipt.description}</p>
                        <p className="text-lg font-bold text-primary">${receipt.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(receipt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {receipts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No receipts added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center font-bold text-lg">
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
    </div>
  );
};

export default AddReceipt;