import { ArrowLeft, FileText, Download, Eye, Upload, Calendar, Sunrise, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

const CabinSeasonalDocs = () => {
  const navigate = useNavigate();

  const openingDocuments = [
    {
      id: 1,
      name: "Spring Opening Checklist",
      type: "Checklist",
      size: "1.2 MB",
      lastModified: "2024-03-15",
      description: "Complete checklist for opening cabin after winter"
    },
    {
      id: 2,
      name: "Water System Startup Guide",
      type: "Instructions",
      size: "856 KB",
      lastModified: "2024-03-10",
      description: "Step-by-step water system activation procedures"
    },
    {
      id: 3,
      name: "Electrical System Check",
      type: "Safety",
      size: "723 KB",
      lastModified: "2024-03-12",
      description: "Electrical safety inspection and startup protocol"
    },
    {
      id: 4,
      name: "Grounds and Exterior Prep",
      type: "Maintenance",
      size: "2.1 MB",
      lastModified: "2024-03-18",
      description: "Property preparation and exterior maintenance tasks"
    }
  ];

  const closingDocuments = [
    {
      id: 5,
      name: "Fall Closing Checklist",
      type: "Checklist",
      size: "1.4 MB",
      lastModified: "2024-10-15",
      description: "Complete checklist for winterizing the cabin"
    },
    {
      id: 6,
      name: "Water System Winterization",
      type: "Instructions",
      size: "967 KB",
      lastModified: "2024-10-12",
      description: "Comprehensive water system shutdown and protection"
    },
    {
      id: 7,
      name: "Heating System Shutdown",
      type: "Safety",
      size: "634 KB",
      lastModified: "2024-10-10",
      description: "Safe shutdown procedures for heating systems"
    },
    {
      id: 8,
      name: "Security and Storage",
      type: "Security",
      size: "1.1 MB",
      lastModified: "2024-10-18",
      description: "Property security and storage preparation guidelines"
    }
  ];

  const DocumentCard = ({ doc }: { doc: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{doc.name}</CardTitle>
              <CardDescription className="mt-1">
                {doc.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded text-xs font-medium">
            {doc.type}
          </span>
          <span>{doc.size}</span>
          <span>Modified: {doc.lastModified}</span>
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
              <h1 className="text-2xl font-semibold text-foreground">Cabin Seasonal Documents</h1>
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
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Spring Opening Documents</h2>
              <p className="text-muted-foreground">
                Essential documents and checklists for opening the cabin after winter closure
              </p>
            </div>
            
            <div className="grid gap-4">
              {openingDocuments.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="closing" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Fall Closing Documents</h2>
              <p className="text-muted-foreground">
                Comprehensive guides for properly winterizing and securing the cabin
              </p>
            </div>
            
            <div className="grid gap-4">
              {closingDocuments.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Documents
            </CardTitle>
            <CardDescription>
              Add new opening or closing procedures, checklists, or reference materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop seasonal documents here, or click to select
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline">
                  Choose Opening Documents
                </Button>
                <Button variant="outline">
                  Choose Closing Documents
                </Button>
              </div>
            </div>
            
            {/* Recent Uploads */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Recent Uploads</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Updated Spring Checklist 2024.pdf</p>
                      <p className="text-xs text-muted-foreground">Uploaded 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Generator Maintenance Guide.docx</p>
                      <p className="text-xs text-muted-foreground">Uploaded yesterday</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CabinSeasonalDocs;