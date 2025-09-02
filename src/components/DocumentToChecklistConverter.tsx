import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckSquare, FileText, Edit2, Trash2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import type { CustomChecklist } from '@/hooks/useChecklistData';

interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  category?: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export const DocumentToChecklistConverter = () => {
  const [documentText, setDocumentText] = useState('');
  const [checklistType, setChecklistType] = useState<'closing' | 'opening' | 'seasonal' | 'maintenance'>('closing');
  const [parsedSections, setParsedSections] = useState<ChecklistSection[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  
  const { saveChecklist, loading } = useCustomChecklists();

  // Parse bulleted text into checklist items
  const parseDocumentText = () => {
    if (!documentText.trim()) {
      toast({ title: "Please enter some text to convert", variant: "destructive" });
      return;
    }

    const lines = documentText.split('\n').map(line => line.trim()).filter(line => line);
    const sections: ChecklistSection[] = [];
    let currentSection: ChecklistSection | null = null;

    lines.forEach((line, index) => {
      // Check if it's a section header (not bulleted, typically in caps or ends with colon)
      if (!line.match(/^[\s]*[-•*]\s/) && (line.includes(':') || line === line.toUpperCase())) {
        // Save previous section if exists
        if (currentSection && currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: line.replace(':', ''),
          items: []
        };
      } else if (line.match(/^[\s]*[-•*]\s/) || line.match(/^\d+\.\s/)) {
        // It's a bulleted or numbered item
        const cleanedText = line.replace(/^[\s]*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
        
        if (cleanedText) {
          if (!currentSection) {
            currentSection = {
              title: 'Main Checklist',
              items: []
            };
          }
          
          currentSection.items.push({
            id: `item_${Date.now()}_${index}`,
            text: cleanedText,
            completed: false
          });
        }
      } else if (line && currentSection) {
        // Regular text line, add as an item if we're in a section
        currentSection.items.push({
          id: `item_${Date.now()}_${index}`,
          text: line,
          completed: false
        });
      }
    });

    // Add final section
    if (currentSection && currentSection.items.length > 0) {
      sections.push(currentSection);
    }

    if (sections.length === 0) {
      toast({ title: "No valid checklist items found", variant: "destructive" });
      return;
    }

    setParsedSections(sections);
    setIsPreviewMode(true);
    toast({ title: `Parsed ${sections.reduce((acc, s) => acc + s.items.length, 0)} checklist items!` });
  };

  // Edit an item
  const editItem = (sectionIndex: number, itemIndex: number, newText: string) => {
    const updatedSections = [...parsedSections];
    updatedSections[sectionIndex].items[itemIndex].text = newText;
    setParsedSections(updatedSections);
    setEditingItem(null);
  };

  // Delete an item
  const deleteItem = (sectionIndex: number, itemIndex: number) => {
    const updatedSections = [...parsedSections];
    updatedSections[sectionIndex].items.splice(itemIndex, 1);
    
    // Remove section if it's empty
    if (updatedSections[sectionIndex].items.length === 0) {
      updatedSections.splice(sectionIndex, 1);
    }
    
    setParsedSections(updatedSections);
  };

  // Add a new item to a section
  const addItem = (sectionIndex: number) => {
    const updatedSections = [...parsedSections];
    updatedSections[sectionIndex].items.push({
      id: `item_${Date.now()}_new`,
      text: 'New item',
      completed: false
    });
    setParsedSections(updatedSections);
    setEditingItem(`${sectionIndex}_${updatedSections[sectionIndex].items.length - 1}`);
  };

  // Save the checklist
  const saveConvertedChecklist = async () => {
    try {
      // Transform sections into the format expected by the checklist system
      const checklistData = parsedSections.map(section => ({
        title: section.title,
        items: section.items.map(item => ({
          id: item.id,
          text: item.text,
          completed: false
        }))
      }));

      await saveChecklist(checklistType, checklistData);
      
      // Reset the form
      setDocumentText('');
      setParsedSections([]);
      setIsPreviewMode(false);
      
      toast({ title: `${checklistType} checklist saved successfully!` });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({ title: "Error saving checklist", variant: "destructive" });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document to Checklist Converter
        </CardTitle>
        <CardDescription>
          Convert your bulleted Word document into an interactive checklist. 
          Simply paste your text below and we'll parse it into checklist items.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!isPreviewMode ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="checklist-type">Checklist Type</Label>
              <Select value={checklistType} onValueChange={(value: any) => setChecklistType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select checklist type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closing">Cabin Closing</SelectItem>
                  <SelectItem value="opening">Cabin Opening</SelectItem>
                  <SelectItem value="seasonal">Seasonal Tasks</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-text">
                Paste Your Bulleted Document Text
              </Label>
              <Textarea
                id="document-text"
                placeholder="Paste your bulleted text here...

Example:
CABIN CLOSING CHECKLIST:
• Turn off main water supply
• Drain all pipes and faucets
• Check all windows are secure

HEATING SYSTEM:
• Turn off furnace
• Set thermostat to 55°F
• Check for proper ventilation"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={parseDocumentText}
                disabled={!documentText.trim()}
                className="flex items-center gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                Parse into Checklist
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Preview: {checklistType} Checklist</h3>
                <p className="text-sm text-muted-foreground">
                  {parsedSections.reduce((acc, s) => acc + s.items.length, 0)} total items across {parsedSections.length} sections
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPreviewMode(false)}
                >
                  Edit Text
                </Button>
                <Button 
                  onClick={saveConvertedChecklist}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Save Checklist
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-6">
              {parsedSections.map((section, sectionIndex) => (
                <Card key={sectionIndex} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        {editingItem === `${sectionIndex}_${itemIndex}` ? (
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => editItem(sectionIndex, itemIndex, e.target.value)}
                            onBlur={() => setEditingItem(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingItem(null);
                            }}
                            className="flex-1 bg-background border rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="flex-1 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                            onClick={() => setEditingItem(`${sectionIndex}_${itemIndex}`)}
                          >
                            {item.text}
                          </span>
                        )}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItem(`${sectionIndex}_${itemIndex}`)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItem(sectionIndex, itemIndex)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addItem(sectionIndex)}
                      className="w-full h-8 text-muted-foreground border-dashed border hover:border-solid"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Add item
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};