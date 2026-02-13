import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordDocumentUploader } from '@/components/WordDocumentUploader';
import { BackfillImages } from '@/components/BackfillImages';
import { InteractiveChecklist } from '@/components/InteractiveChecklist';
import { ChecklistImageSelector } from '@/components/ChecklistImageSelector';
import { ExistingImagesBrowser } from '@/components/ExistingImagesBrowser';
import { ImageLibraryManager } from '@/components/ImageLibraryManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, List, Plus, CheckSquare, Trash2, Save, Eye, Image as ImageIcon, Type, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { ErrorBoundary, DefaultErrorFallback } from '@/components/ErrorBoundary';
import { toast } from '@/hooks/use-toast';
import { ChecklistImageKey } from '@/lib/checklist-image-library';
import { WhatCanItDoDialog, StepsToMakeDialog } from '@/components/checklist/ChecklistHelpDialogs';
import { ChecklistPathwayCards } from '@/components/checklist/ChecklistPathwayCards';
import { QuickChecklistCreator } from '@/components/checklist/QuickChecklistCreator';
import { PhotoRepositoryPanel } from '@/components/checklist/PhotoRepositoryPanel';

export default function ChecklistCreator() {
  const navigate = useNavigate();
  const [createdChecklistId, setCreatedChecklistId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'quick' | 'illustrated' | 'import' | 'view'>('landing');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedSeasonalType, setSelectedSeasonalType] = useState<string>('seasonal');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [manualItems, setManualItems] = useState<Array<{id: string, text: string, imageUrls?: string[]}>>([]);
  const [newItemText, setNewItemText] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { checklists, loading, refetch, deleteChecklist, saveChecklist } = useCustomChecklists();

  const handleChecklistCreated = (checklistId: string) => {
    setCreatedChecklistId(checklistId);
    setViewMode('view');
    refetch();
  };

  const handleBackToLanding = () => {
    setViewMode('landing');
    setCreatedChecklistId(null);
  };

  const addManualItem = () => {
    if (!newItemText.trim()) return;
    const newItem = { id: `item-${Date.now()}`, text: newItemText.trim() };
    setManualItems(prev => [...prev, newItem]);
    setNewItemText('');
    toast({ title: "Item added successfully" });
  };

  const addItemWithImage = (imageUrl: string, key?: ChecklistImageKey) => {
    const newItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim() || (key ? key.replace(/-/g, ' ') : 'New item'),
      imageUrls: [imageUrl]
    };
    setManualItems(prev => [...prev, newItem]);
    setNewItemText('');
    toast({ title: "Item with image added successfully" });
  };

  const addItemWithExistingImage = (imageUrl: string, description?: string) => {
    const newItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim() || description || 'New item with existing image',
      imageUrls: [imageUrl]
    };
    setManualItems(prev => [...prev, newItem]);
    setNewItemText('');
    toast({ title: "Item with existing image added successfully" });
  };

  const parseContentToItems = () => {
    if (!pasteContent.trim()) {
      toast({ title: "No content", description: "Please paste some checklist content.", variant: "destructive" });
      return;
    }
    const lines = pasteContent.split('\n').filter(line => line.trim());
    const newItems = lines.map((line, index) => ({
      id: `pasted-item-${Date.now()}-${index}`,
      text: line.trim().replace(/^[-•*]\s*/, '')
    }));
    setManualItems(prev => [...prev, ...newItems]);
    setPasteContent('');
    toast({ title: `${newItems.length} items added`, description: "You can now assign existing images to these items." });
  };

  const removeManualItem = (id: string) => {
    setManualItems(prev => prev.filter(item => item.id !== id));
    toast({ title: "Item removed" });
  };

  const createManualChecklist = async () => {
    if (manualItems.length === 0) {
      toast({ title: "No items", description: "Please add some items to create a checklist.", variant: "destructive" });
      return;
    }
    try {
      const checklistData = {
        checklist_type: 'manual_created',
        items: manualItems.map(item => ({ text: item.text, completed: false })),
        images: manualItems.flatMap(item => item.imageUrls ? item.imageUrls.map(url => ({ url })) : [])
      };
      toast({ title: "Manual checklist created!", description: "You can now save it to seasonal checklists." });
      console.log('Manual checklist data:', checklistData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create checklist.", variant: "destructive" });
    }
  };

  const handleSaveToSeasonal = async () => {
    const selectedChecklist = checklists?.find(c => c.id === createdChecklistId);
    if (selectedChecklist) {
      try {
        const typeToSave = isCustomType && customTypeName.trim() ? customTypeName.trim() : selectedSeasonalType;
        if (!typeToSave) {
          toast({ title: "Error", description: "Please enter a valid checklist type name.", variant: "destructive" });
          return;
        }
        await saveChecklist(typeToSave, selectedChecklist.items || [], selectedChecklist.images || []);
        toast({ title: "Checklist Saved!", description: `Checklist saved to ${typeToSave} checklists successfully.` });
        setIsSaveDialogOpen(false);
        setIsCustomType(false);
        setCustomTypeName('');
        navigate('/seasonal-checklists');
      } catch (error) {
        toast({ title: "Error", description: "Failed to save checklist. Please try again.", variant: "destructive" });
      }
    }
  };

  // View mode: show interactive checklist
  if (viewMode === 'view' && createdChecklistId) {
    const selectedChecklist = checklists?.find(c => c.id === createdChecklistId);
    if (selectedChecklist) {
      return (
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToLanding} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Creator
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Interactive Checklist</h1>
                <p className="text-muted-foreground">Track your progress through the checklist</p>
              </div>
            </div>
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save to Seasonal Checklists
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save to Seasonal Checklists</DialogTitle>
                  <DialogDescription>Choose which type of seasonal checklist to save this as.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Checklist Type</label>
                    <Select value={isCustomType ? 'custom' : selectedSeasonalType} onValueChange={(value) => {
                      if (value === 'custom') {
                        setIsCustomType(true);
                        setSelectedSeasonalType('');
                      } else {
                        setIsCustomType(false);
                        setSelectedSeasonalType(value);
                        setCustomTypeName('');
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select checklist type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closing">Cabin Closing</SelectItem>
                        <SelectItem value="opening">Cabin Opening</SelectItem>
                        <SelectItem value="seasonal">Seasonal Tasks</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="arrival">Arrival Checklist</SelectItem>
                        <SelectItem value="daily">Daily Tasks</SelectItem>
                        <SelectItem value="custom">Custom Type...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isCustomType && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custom Type Name</label>
                      <Input
                        value={customTypeName}
                        onChange={(e) => setCustomTypeName(e.target.value)}
                        placeholder="Enter custom checklist type name..."
                        className="w-full"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsSaveDialogOpen(false); setIsCustomType(false); setCustomTypeName(''); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveToSeasonal}>Save Checklist</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <InteractiveChecklist
            checklistId={selectedChecklist.id}
            title={selectedChecklist.checklist_type}
            items={selectedChecklist.items}
            introductoryText={selectedChecklist.introductory_text}
          />
        </div>
      );
    } else {
      return (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Checklist not found. Please try creating a new one.</p>
              <Button onClick={handleBackToLanding} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Creator
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Quick path
  if (viewMode === 'quick') {
    return (
      <ErrorBoundary fallback={DefaultErrorFallback}>
        <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
          <div className="container mx-auto p-6 space-y-6">
            <PageHeader 
              title="Checklist Creator"
              subtitle="Quick text-only checklist"
              icon={CheckSquare}
              backgroundImage={true}
            />
            <QuickChecklistCreator onBack={handleBackToLanding} />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Import path
  if (viewMode === 'import') {
    return (
      <ErrorBoundary fallback={DefaultErrorFallback}>
        <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
          <div className="container mx-auto p-6 space-y-6">
            <PageHeader 
              title="Checklist Creator"
              subtitle="Import from a document"
              icon={CheckSquare}
              backgroundImage={true}
            />
            <div className="flex items-center gap-3 mb-4">
              <Button variant="outline" size="sm" onClick={handleBackToLanding}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <div className="flex justify-center">
              <WordDocumentUploader onChecklistCreated={handleChecklistCreated} />
            </div>
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✨ Enhanced Features</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Image Markers:</strong> Use [IMAGE:Picture1] or [IMAGE:tool.jpg:Description] in your text</li>
                  <li>• <strong>Smart Formatting:</strong> **Bold text** and *italic text* are automatically styled</li>
                  <li>• <strong>Visual Hierarchy:</strong> Warnings, notes, and steps get appropriate icons and colors</li>
                  <li>• <strong>Interactive Progress:</strong> Check off items and track completion</li>
                  <li>• <strong>Image Matching:</strong> Upload images that automatically match to your markers</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Illustrated path
  if (viewMode === 'illustrated') {
    const handleAttachPhoto = (imageUrl: string, description?: string) => {
      if (!selectedItemId) return;
      setManualItems(prev =>
        prev.map(item =>
          item.id === selectedItemId
            ? { ...item, imageUrls: [...(item.imageUrls || []), imageUrl] }
            : item
        )
      );
      toast({ title: 'Photo attached', description: description || 'Photo added to item' });
    };

    const selectedItem = manualItems.find(i => i.id === selectedItemId);

    return (
      <ErrorBoundary fallback={DefaultErrorFallback}>
        <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
          <div className="container mx-auto p-6 space-y-6">
            <PageHeader 
              title="Checklist Creator"
              subtitle="Illustrated checklist with reference photos"
              icon={CheckSquare}
              backgroundImage={true}
            >
              <div className="flex justify-end">
                <ImageLibraryManager />
              </div>
            </PageHeader>

            <div className="flex items-center gap-3 mb-4">
              <Button variant="outline" size="sm" onClick={handleBackToLanding}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex justify-center">
                <BackfillImages />
              </div>
            </div>

            {/* Paste Content Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Paste Checklist Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste your checklist content here (one item per line)..."
                  className="min-h-[120px]"
                />
                <Button onClick={parseContentToItems} disabled={!pasteContent.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Parse to Items
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Individual Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Enter checklist item..."
                    onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
                  />
                  <Button onClick={addManualItem} disabled={!newItemText.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {manualItems.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      Items ({manualItems.length})
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        — click an item, then attach photos below
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {manualItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                          className={`flex items-start justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedItemId === item.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="space-y-2 flex-1">
                            <p className="text-sm">{item.text}</p>
                            {item.imageUrls && item.imageUrls.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {item.imageUrls.map((url, idx) => (
                                  <div key={idx} className="w-12 h-12 rounded border overflow-hidden">
                                    <img src={url} alt={`Item image ${idx + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); removeManualItem(item.id); }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <Button onClick={createManualChecklist} className="w-full">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Create Checklist ({manualItems.length} items)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photo Repository Panel */}
            <PhotoRepositoryPanel
              selectedItemId={selectedItemId}
              selectedItemLabel={selectedItem?.text}
              onAttachPhoto={handleAttachPhoto}
              attachedPhotos={selectedItem?.imageUrls || []}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Landing page (default)
  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
        <div className="container mx-auto p-6 space-y-6">
          <PageHeader 
            title="Checklist Creator"
            subtitle="Create interactive checklists for your cabin"
            icon={CheckSquare}
            backgroundImage={true}
          >
            <div className="flex gap-2 justify-end">
              <WhatCanItDoDialog />
              <StepsToMakeDialog />
            </div>
          </PageHeader>

          {/* Three pathway cards */}
          <ChecklistPathwayCards onSelectPath={(path) => setViewMode(path)} />

          {/* Photo Repository — always visible on landing */}
          <PhotoRepositoryPanel
            selectedItemId={null}
            onAttachPhoto={() => {}}
            attachedPhotos={[]}
            browseOnly
          />

          {/* Existing checklists */}
          {!loading && checklists && checklists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Your Existing Checklists ({checklists.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {checklists.map((checklist) => (
                    <div key={checklist.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <div>
                          <h3 className="font-medium capitalize">{checklist.checklist_type}</h3>
                          <p className="text-sm text-muted-foreground">
                            {checklist.items?.length || 0} items
                            {checklist.images && checklist.images.length > 0 && (
                              <span> • {checklist.images.length} images</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCreatedChecklistId(checklist.id);
                            setViewMode('view');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteChecklist(checklist.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
