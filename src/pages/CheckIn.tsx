import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, AlertTriangle, Plus, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CheckIn = () => {
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState([
    { id: "keys", label: "Picked up keys", category: "arrival" },
    { id: "walkthrough", label: "Completed property walkthrough", category: "arrival" },
    { id: "utilities", label: "Checked utilities (water, power, heat)", category: "arrival" },
    { id: "wifi", label: "Connected to WiFi", category: "arrival" },
    { id: "emergency", label: "Located emergency contacts and procedures", category: "arrival" },
    { id: "rules", label: "Reviewed cabin rules and policies", category: "arrival" },
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");

  // Load organization-specific checklist on mount
  useEffect(() => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      const savedChecklist = localStorage.getItem(`checklist_${organizationCode}`);
      if (savedChecklist) {
        setChecklistItems(JSON.parse(savedChecklist));
      }
    }
  }, []);

  const handleCheckChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const saveChecklist = () => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      localStorage.setItem(`checklist_${organizationCode}`, JSON.stringify(checklistItems));
      toast({
        title: "Checklist Saved",
        description: "Checklist has been saved for your organization.",
      });
    }
  };

  const addNewItem = () => {
    if (newItemLabel.trim()) {
      const newItem = {
        id: `custom_${Date.now()}`,
        label: newItemLabel.trim(),
        category: "arrival"
      };
      setChecklistItems(prev => [...prev, newItem]);
      setNewItemLabel("");
      saveChecklist();
    }
  };

  const handleSubmit = () => {
    const completedItems = Object.values(checkedItems).filter(Boolean).length;
    toast({
      title: "Check-in Completed",
      description: `${completedItems} of ${checklistItems.length} items completed.`,
    });
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2 flex items-center">
            <CheckCircle className="h-10 w-10 mr-3" />
            Arrival Check-In
          </h1>
          <p className="text-lg text-primary-foreground/80">Complete your arrival checklist</p>
        </div>

        <div className="grid gap-6">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Arrival Checklist</CardTitle>
              <CardDescription>Please complete all items to finalize your check-in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={item.id}
                    checked={checkedItems[item.id] || false}
                    onCheckedChange={(checked) => handleCheckChange(item.id, checked as boolean)}
                  />
                  <label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {item.label}
                  </label>
                </div>
              ))}
              
              {isEditing && (
                <div className="flex items-center space-x-2 mt-4">
                  <Input
                    placeholder="Add new checklist item..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
                  />
                  <Button onClick={addNewItem} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex flex-col space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Check-in time: {new Date().toLocaleString()}
                    </span>
                  </div>
                  <Button onClick={handleSubmit} className="bg-primary">
                    Complete Check-In
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? "Done Editing" : "Edit Checklist"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Items
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any issues or observations to report?</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any notes, issues, or observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default CheckIn;