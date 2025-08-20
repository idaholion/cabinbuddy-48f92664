import { useState } from "react";
import { ArrowLeft, FileText, Download, Eye, Calendar, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";
import { useMultiOrganization } from "@/hooks/useMultiOrganization";
const Documents = () => {
  const navigate = useNavigate();
  const { documents, loading, uploadDocument, addDocumentLink, deleteDocument, viewDocument } = useDocuments();
  const { user } = useAuth();
  const { activeOrganization, loading: orgLoading } = useMultiOrganization();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "",
    file: null as File | null,
    fileUrl: ""
  });

  const categories = [
    "Legal Document",
    "Insurance", 
    "Maintenance",
    "Reference",
    "Financial",
    "Emergency",
    "Safety"
  ];

  const handleFileUpload = async () => {
    if (!uploadForm.title || !uploadForm.category) return;

    setUploading(true);
    try {
      if (uploadForm.file) {
        await uploadDocument(uploadForm.file, {
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category
        });
      } else if (uploadForm.fileUrl) {
        await addDocumentLink({
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          file_url: uploadForm.fileUrl
        });
      }

      setUploadForm({
        title: "",
        description: "",
        category: "",
        file: null,
        fileUrl: ""
      });
      setIsUploadOpen(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: any) => {
    await viewDocument(document);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState
          title="No organization selected"
          description="Select or create an organization to manage documents."
          action={{ label: "Manage organizations", onClick: () => navigate("/manage-organizations") }}
        />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="shrink-0 text-base"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Documents</h1>
              <p className="text-base text-muted-foreground">
                Access important cabin documentation and files
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Quick Access Section - Only show when no documents exist */}
        {documents.length === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription className="text-base">
                Navigate to specialized document collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4 text-base"
                  onClick={() => navigate("/cabin-seasonal-docs")}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium text-base">Cabin Opening & Closing Documents</div>
                      <div className="text-base text-muted-foreground">Seasonal procedures and checklists</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <CardDescription className="mt-1 text-base">
                        {doc.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="text-base"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="text-base"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    {user?.id === doc.uploaded_by_user_id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-destructive hover:text-destructive text-base"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-base text-muted-foreground">
                  <span className="bg-secondary px-2 py-1 rounded text-base font-medium">
                    {doc.category}
                  </span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>Modified: {new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {documents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4 text-base">Upload your first document to get started!</p>
          </div>
        )}

        {/* Upload Section */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Upload New Document</CardTitle>
              <CardDescription className="text-base">
                Add important documents for easy access by family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DialogTrigger asChild>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-base text-muted-foreground mb-4">
                    Click to upload documents or add links
                  </p>
                  <Button variant="outline" className="text-base">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </DialogTrigger>
            </CardContent>
          </Card>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription className="text-base">
                Upload a file or add a link to an external document
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-base">Document Title</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="Enter document title"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-base">Description (Optional)</Label>
                <Input
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Brief description of the document"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-base">Category</Label>
                <Select 
                  value={uploadForm.category} 
                  onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="text-base">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file" className="text-base">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div className="text-center text-base text-muted-foreground">OR</div>
              <div>
                <Label htmlFor="fileUrl" className="text-base">Document URL</Label>
                <Input
                  id="fileUrl"
                  value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                  placeholder="https://example.com/document.pdf"
                  className="text-base placeholder:text-base"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)} className="text-base">
                Cancel
              </Button>
              <Button 
                onClick={handleFileUpload} 
                disabled={uploading || !uploadForm.title || !uploadForm.category || (!uploadForm.file && !uploadForm.fileUrl)}
                className="text-base"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Documents;