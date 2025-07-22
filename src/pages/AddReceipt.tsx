import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Camera, DollarSign, Trash2, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const AddReceipt = () => {
  const [amount, setAmount] = useState("");
  const [uploadAmount, setUploadAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [receipts, setReceipts] = useState([
    {
      id: 1,
      amount: 45.67,
      description: "Grocery store receipt",
      thumbnail: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=100&h=100&fit=crop"
    },
    {
      id: 2,
      amount: 23.45,
      description: "Gas station",
      thumbnail: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop"
    },
    {
      id: 3,
      amount: 156.78,
      description: "Hardware store supplies",
      thumbnail: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=100&h=100&fit=crop"
    }
  ]);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Receipt uploaded",
        description: `${file.name} has been uploaded successfully.`,
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      toast({
        title: "Receipt dropped",
        description: `${files[0].name} has been uploaded successfully.`,
      });
    }
  };

  const handleTakePicture = () => {
    toast({
      title: "Camera feature",
      description: "Camera functionality would be implemented here.",
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description) {
      toast({
        title: "Receipt added",
        description: `Manual receipt for $${amount} has been added.`,
      });
      setAmount("");
      setDescription("");
    }
  };

  const handleDeleteReceipt = (id: number) => {
    setReceipts(receipts.filter(receipt => receipt.id !== id));
    toast({
      title: "Receipt deleted",
      description: "Receipt has been removed from the list.",
    });
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Add Receipt</h1>
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 scale-75 origin-top">
          {/* Upload and Camera Section */}
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
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button asChild className="w-full">
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drag and drop your receipt here
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supports images and PDF files
                  </p>
                </div>

                <Button onClick={handleTakePicture} variant="outline" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Picture of Receipt
                </Button>

                <div className="pt-4 border-t">
                  <Label htmlFor="upload-amount">Receipt Amount</Label>
                  <Input
                    id="upload-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={uploadAmount}
                    onChange={(e) => setUploadAmount(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipts List Section */}
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
                    <div key={receipt.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      <img 
                        src={receipt.thumbnail} 
                        alt="Receipt thumbnail"
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{receipt.description}</p>
                        <p className="text-lg font-bold text-primary">${receipt.amount.toFixed(2)}</p>
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

      {/* Manual Entry Section - Fixed to lower left */}
      <div className="absolute bottom-4 left-4 w-80 scale-75">
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
                />
              </div>
              
              <Button type="submit" className="w-full">
                Add Receipt Manually
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddReceipt;