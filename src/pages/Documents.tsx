import { ArrowLeft, FileText, Download, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Documents = () => {
  const navigate = useNavigate();

  const documents = [
    {
      id: 1,
      name: "Property Deed",
      type: "Legal Document",
      size: "2.3 MB",
      lastModified: "2024-01-15",
      description: "Official property ownership documentation"
    },
    {
      id: 2,
      name: "Insurance Policy",
      type: "Insurance",
      size: "1.8 MB",
      lastModified: "2024-02-20",
      description: "Comprehensive property insurance coverage details"
    },
    {
      id: 3,
      name: "Maintenance Records",
      type: "Maintenance",
      size: "5.2 MB",
      lastModified: "2024-03-10",
      description: "Complete history of property maintenance and repairs"
    },
    {
      id: 4,
      name: "Rental Agreement Template",
      type: "Legal Document",
      size: "876 KB",
      lastModified: "2024-02-28",
      description: "Standard rental agreement for family bookings"
    },
    {
      id: 5,
      name: "Emergency Contacts",
      type: "Reference",
      size: "124 KB",
      lastModified: "2024-03-05",
      description: "Local emergency services and important contacts"
    },
    {
      id: 6,
      name: "Appliance Manuals",
      type: "Reference",
      size: "12.4 MB",
      lastModified: "2024-01-30",
      description: "User manuals for all cabin appliances and equipment"
    }
  ];

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
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Documents</h1>
              <p className="text-sm text-muted-foreground">
                Access important cabin documentation and files
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Quick Access Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>
              Navigate to specialized document collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={() => navigate("/cabin-seasonal-docs")}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Cabin Opening & Closing Documents</div>
                    <div className="text-sm text-muted-foreground">Seasonal procedures and checklists</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

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
          ))}
        </div>

        {/* Upload Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>
              Add important documents for easy access by family members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop files here, or click to select
              </p>
              <Button variant="outline">
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Documents;