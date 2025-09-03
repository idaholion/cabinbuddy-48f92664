import { InteractivePdfViewer } from '@/components/InteractivePdfViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, FileText, MousePointer } from 'lucide-react';

const PdfChecklistCreator = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">Interactive PDF Checklist</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upload your winterizing procedure PDF and add interactive checkboxes directly on the document. 
          Keep your original formatting, pictures, and text while making it interactive.
        </p>
      </div>

      {/* How it Works */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">1. Upload PDF</h3>
            <p className="text-sm text-muted-foreground">
              Upload your procedure document with text and pictures
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <MousePointer className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">2. Click to Add</h3>
            <p className="text-sm text-muted-foreground">
              Click anywhere to place checkboxes next to line items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckSquare className="h-12 w-12 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">3. Check Off Items</h3>
            <p className="text-sm text-muted-foreground">
              Check off completed items and track your progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive PDF Viewer */}
      <InteractivePdfViewer 
        onSave={(checkboxes) => {
          console.log('Saving progress:', checkboxes);
          // Here you could save to database if needed
        }}
      />
    </div>
  );
};

export default PdfChecklistCreator;