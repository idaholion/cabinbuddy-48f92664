import { ArrowLeft, FileText, Download, Eye, Upload, Calendar, Sunrise, Sunset, Trash2, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useSeasonalDocs } from "@/hooks/useSeasonalDocs";
import { useSupervisor } from "@/hooks/useSupervisor";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CabinSeasonalDocs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { seasonalDocs, loading, addSeasonalDoc, updateSeasonalDoc, deleteSeasonalDoc, getDocumentsBySeasonPattern, uploadFile } = useSeasonalDocs();
  const { isSupervisor } = useSupervisor();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newDoc, setNewDoc] = useState({
    season: "",
    title: "",
    description: "",
    external_url: "",
    document_type: "guide",
    file: null as File | null
  });
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

  const openingDocuments = getDocumentsBySeasonPattern("opening");
  const closingDocuments = getDocumentsBySeasonPattern("closing");

  const handleAddDocument = async () => {
    if (!newDoc.title || !newDoc.season) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    if (!newDoc.file && !newDoc.external_url) {
      toast({
        title: "Error",
        description: "Please provide either a file or external URL",
        variant: "destructive"
      });
      return;
    }

    try {
      await addSeasonalDoc(newDoc);
      setNewDoc({
        season: "",
        title: "",
        description: "",
        external_url: "",
        document_type: "guide",
        file: null
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Failed to add document:", error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteSeasonalDoc(docId);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0]; // Handle first file
      setNewDoc({
        season: "opening", // Default to opening
        title: file.name.split('.')[0], // Use filename as title
        description: "",
        external_url: "",
        document_type: "guide",
        file
      });
      setIsAddDialogOpen(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a large image that might benefit from quality selection
    if (file.type.startsWith('image/') && file.size > 100 * 1024) { // > 100KB
      setPendingFile(file);
      setShowQualityDialog(true);
      e.target.value = "";
      return;
    }

    // For small images or non-images, use directly
    setNewDoc({
      ...newDoc,
      file,
      title: newDoc.title || file.name.split('.')[0]
    });
  };

  const handleQualitySelection = async (qualityKey: keyof typeof qualityOptions) => {
    if (!pendingFile) return;

    setShowQualityDialog(false);
    const options = qualityOptions[qualityKey];
    
    try {
      const processedFile = await compressImage(pendingFile, options.maxWidth, options.maxHeight, options.quality);
      setNewDoc({
        ...newDoc,
        file: processedFile,
        title: newDoc.title || processedFile.name.split('.')[0]
      });
      setPendingFile(null);
    } catch (error) {
      console.error('Error processing image:', error);
      setPendingFile(null);
    }
  };

  const DocumentCard = ({ doc }: { doc: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{doc.title}</CardTitle>
              <CardDescription className="mt-1">
                {doc.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {doc.external_url && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(doc.external_url, '_blank')}
              >
                <Eye className="h-4 w-4" />
                View
              </Button>
            )}
            {doc.file_url && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(doc.file_url, '_blank')}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
            {isSupervisor && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDeleteDocument(doc.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded text-xs font-medium">
            {doc.document_type}
          </span>
          <span>Season: {doc.season}</span>
          <span>Modified: {new Date(doc.updated_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/documents")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Cabin Seasonal Documents</h1>
              <p className="text-sm text-muted-foreground">
                Opening and closing procedures and documentation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="opening" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="opening" className="flex items-center gap-2">
              <Sunrise className="h-4 w-4" />
              Cabin Opening
            </TabsTrigger>
            <TabsTrigger value="closing" className="flex items-center gap-2">
              <Sunset className="h-4 w-4" />
              Cabin Closing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opening" className="space-y-4">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold mb-2">Spring Opening Documents</h2>
                <p className="text-muted-foreground">
                  Essential documents and checklists for opening the cabin after winter closure
                </p>
              </div>
              {isSupervisor && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setNewDoc({ ...newDoc, season: "opening" })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Opening Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Seasonal Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newDoc.title}
                          onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                          placeholder="Document title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newDoc.description}
                          onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                          placeholder="Document description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="season">Season</Label>
                        <Select value={newDoc.season} onValueChange={(value) => setNewDoc({ ...newDoc, season: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select season" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opening">Opening</SelectItem>
                            <SelectItem value="closing">Closing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="file">Upload File</Label>
                        <Input
                          ref={fileInputRef}
                          id="file"
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        />
                        {newDoc.file && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Selected: {newDoc.file.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="external_url">External URL (optional)</Label>
                        <Input
                          id="external_url"
                          value={newDoc.external_url}
                          onChange={(e) => setNewDoc({ ...newDoc, external_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddDocument}>Add Document</Button>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="grid gap-4">
              {loading ? (
                <p>Loading documents...</p>
              ) : openingDocuments.length > 0 ? (
                openingDocuments.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No opening documents found.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="closing" className="space-y-4">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold mb-2">Fall Closing Documents</h2>
                <p className="text-muted-foreground">
                  Comprehensive guides for properly winterizing and securing the cabin
                </p>
              </div>
              {isSupervisor && (
                <Button onClick={() => {
                  setNewDoc({ ...newDoc, season: "closing" });
                  setIsAddDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Closing Document
                </Button>
              )}
            </div>
            
            <div className="grid gap-4">
              {loading ? (
                <p>Loading documents...</p>
              ) : closingDocuments.length > 0 ? (
                closingDocuments.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No closing documents found.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Section - Only for Supervisors */}
        {isSupervisor && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Drag & Drop Upload Area
              </CardTitle>
              <CardDescription>
                Drag and drop seasonal documents here for quick upload
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  {dragActive 
                    ? 'Drop files here to upload'
                    : 'Drag and drop files or click to select'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported: PDF, DOC, DOCX, TXT, JPG, PNG (max 10MB)
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Check if it's a large image that might benefit from quality selection
                    if (file.type.startsWith('image/') && file.size > 100 * 1024) { // > 100KB
                      setPendingFile(file);
                      setShowQualityDialog(true);
                      e.target.value = "";
                      return;
                    }

                    // For small images or non-images, use directly
                    setNewDoc({
                      season: "opening",
                      title: file.name.split('.')[0],
                      description: "",
                      external_url: "",
                      document_type: "guide",
                      file
                    });
                    setIsAddDialogOpen(true);
                  }}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Selection Dialog */}
        <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Choose Image Quality</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground mb-4">
              This image is large ({pendingFile ? Math.round(pendingFile.size / 1024 / 1024 * 100) / 100 : 0}MB). Select compression quality:
            </div>
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
      </div>
    </div>
  );
};

export default CabinSeasonalDocs;