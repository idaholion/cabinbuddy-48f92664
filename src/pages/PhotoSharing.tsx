import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Heart, MessageCircle, Share2, ArrowLeft, Calendar, User } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";

interface Photo {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
  likes: number;
  comments: string[];
}

export default function PhotoSharing() {
  const [photos, setPhotos] = useState<Photo[]>([
    {
      id: "1",
      url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=400",
      caption: "Beautiful sunset from the cabin deck last evening",
      uploadedBy: "Sarah Johnson",
      uploadedAt: "2024-01-15",
      likes: 12,
      comments: ["Gorgeous view!", "Love this place"]
    },
    {
      id: "2", 
      url: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400",
      caption: "Fresh berries we picked during our morning hike",
      uploadedBy: "Mike Davis",
      uploadedAt: "2024-01-14",
      likes: 8,
      comments: ["Yummy!", "Great find!"]
    },
    {
      id: "3",
      url: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=400", 
      caption: "Our cabin cat making new friends",
      uploadedBy: "Emily Wilson",
      uploadedAt: "2024-01-13",
      likes: 15,
      comments: ["So cute!", "Best cabin mascot ever"]
    }
  ]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newPhoto, setNewPhoto] = useState({
    caption: "",
    file: null as File | null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewPhoto({ ...newPhoto, file: e.target.files[0] });
    }
  };

  const handleUpload = () => {
    if (newPhoto.file && newPhoto.caption) {
      const url = URL.createObjectURL(newPhoto.file);
      const photo: Photo = {
        id: Date.now().toString(),
        url,
        caption: newPhoto.caption,
        uploadedBy: "You",
        uploadedAt: new Date().toISOString().split('T')[0],
        likes: 0,
        comments: []
      };
      setPhotos([photo, ...photos]);
      setNewPhoto({ caption: "", file: null });
      setIsUploadOpen(false);
    }
  };

  const handleLike = (photoId: string) => {
    setPhotos(photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, likes: photo.likes + 1 }
        : photo
    ));
  };

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

        <div className="flex justify-end mb-6">
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
                  <Label htmlFor="photo">Photo</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    placeholder="Write a caption for your photo..."
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
                <Button onClick={handleUpload} disabled={!newPhoto.file || !newPhoto.caption}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden bg-card/95 hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${photo.uploadedBy}`} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{photo.uploadedBy}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {photo.uploadedAt}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-foreground mb-3">{photo.caption}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(photo.id)}
                      className="flex items-center space-x-1 text-muted-foreground hover:text-red-500"
                    >
                      <Heart className="h-4 w-4" />
                      <span className="text-xs">{photo.likes}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1 text-muted-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">{photo.comments.length}</span>
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {photo.comments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="space-y-1">
                      {photo.comments.slice(0, 2).map((comment, index) => (
                        <p key={index} className="text-xs text-muted-foreground">
                          "{comment}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}
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