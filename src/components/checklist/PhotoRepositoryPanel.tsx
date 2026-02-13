import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
// ScrollArea replaced with native scroll div for reliable scrolling
import { Image as ImageIcon, Search, ChevronDown, ChevronUp, Plus, Check, Upload } from 'lucide-react';
import { useImageLibrary } from '@/hooks/useImageLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';

interface PhotoRepositoryPanelProps {
  /** The currently selected item ID that photos will be attached to */
  selectedItemId: string | null;
  /** Label of the selected item for display */
  selectedItemLabel?: string;
  /** Called when user clicks a photo to attach it to the selected item */
  onAttachPhoto: (imageUrl: string, description?: string) => void;
  /** URLs already attached to the selected item — shown with a check */
  attachedPhotos?: string[];
  /** If true, panel is browse/upload only — no attach functionality */
  browseOnly?: boolean;
}

export const PhotoRepositoryPanel: React.FC<PhotoRepositoryPanelProps> = ({
  selectedItemId,
  selectedItemLabel,
  onAttachPhoto,
  attachedPhotos = [],
  browseOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const { images, loading, fetchImages } = useImageLibrary();
  const { organization } = useOrganization();

  const filtered = images.filter(img => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      img.original_filename.toLowerCase().includes(q) ||
      img.marker_name?.toLowerCase().includes(q)
    );
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${organization.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('checklist-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('checklist-images')
        .getPublicUrl(filePath);

      // Add to library
      const { error: dbError } = await supabase
        .from('checklist_images')
        .insert({
          organization_id: organization.id,
          image_url: publicUrl,
          original_filename: file.name,
          marker_name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          file_size: file.size,
          content_type: file.type,
          uploaded_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      await fetchImages();
      toast({ title: 'Photo uploaded', description: file.name });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleClickPhoto = (imageUrl: string, description?: string) => {
    if (!selectedItemId) {
      toast({
        title: 'Select an item first',
        description: 'Click a checklist item, then click a photo to attach it.',
      });
      return;
    }
    onAttachPhoto(imageUrl, description);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photo Repository
                {images.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {images.length}
                  </Badge>
                )}
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Status bar */}
            <div className="flex items-center justify-between text-xs">
              {selectedItemId ? (
                <span className="text-primary font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Attaching to: <span className="italic truncate max-w-[200px]">{selectedItemLabel || 'selected item'}</span>
                </span>
              ) : browseOnly ? (
                <span className="text-muted-foreground">
                  Browse and manage your photo repository
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Select a checklist item first, then click a photo to attach it
                </span>
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-1 pointer-events-none" tabIndex={-1}>
                  <Upload className="h-3 w-3" />
                  Add Photo to Repository
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search photos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Thumbnail grid */}
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading photos...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {images.length === 0
                    ? 'No photos yet — upload some to get started'
                    : 'No photos match your search'}
                </p>
              </div>
            ) : (
              <div className="max-h-[480px] overflow-y-auto rounded-md border border-border p-2">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {filtered.map((img) => {
                    const isAttached = attachedPhotos.includes(img.image_url);
                    return (
                      <button
                        key={img.id}
                        onClick={() => !browseOnly && handleClickPhoto(img.image_url, img.marker_name || img.original_filename)}
                        className={`relative group rounded-md border-2 overflow-hidden aspect-square transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                          isAttached
                            ? 'border-primary ring-1 ring-primary/30'
                            : browseOnly
                              ? 'border-border cursor-default'
                              : selectedItemId
                                ? 'border-border hover:border-primary/60 cursor-pointer'
                                : 'border-border opacity-70 cursor-not-allowed'
                        }`}
                        disabled={!browseOnly && !selectedItemId}
                        title={img.marker_name || img.original_filename}
                      >
                        <img
                          src={img.image_url}
                          alt={img.marker_name || img.original_filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isAttached && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground bg-primary rounded-full p-0.5" />
                          </div>
                        )}
                        {selectedItemId && !isAttached && !browseOnly && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Plus className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Labels below thumbnails */}
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {filtered.length} photo{filtered.length !== 1 ? 's' : ''} available
                  {filtered.length < images.length && ` (filtered from ${images.length})`}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
