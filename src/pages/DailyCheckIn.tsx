import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Thermometer, Droplets, Zap, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCheckinSessions } from "@/hooks/useChecklistData";

const DailyCheckIn = () => {
  const { toast } = useToast();
  const { createSession } = useCheckinSessions();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [readings, setReadings] = useState({
    temperature: "",
    waterLevel: "",
    powerUsage: ""
  });
  const [notes, setNotes] = useState("");
  const [dailyOccupancy, setDailyOccupancy] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate days for the current stay (example: 7 days)
  const stayDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      key: `day-${i + 1}`,
      label: `Day ${i + 1} (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    };
  });

  const handleOccupancyChange = (dayKey: string, value: string) => {
    setDailyOccupancy(prev => ({ ...prev, [dayKey]: value }));
  };

  const dailyTasks = [
    { id: "security", label: "Checked all doors and windows locked", category: "security" },
    { id: "cleanliness", label: "Maintained cleanliness standards", category: "maintenance" },
    { id: "appliances", label: "All appliances functioning properly", category: "maintenance" },
    { id: "heating", label: "Heating/cooling system operational", category: "utilities" },
    { id: "plumbing", label: "No plumbing issues detected", category: "utilities" },
    { id: "wifi", label: "Internet connection stable", category: "utilities" },
  ];

  const handleCheckChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleReadingChange = (field: string, value: string) => {
    setReadings(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const completedTasks = Object.values(checkedItems).filter(Boolean).length;
      
      // Prepare checklist responses data
      const checklistResponses = {
        tasks: checkedItems,
        readings,
        dailyOccupancy,
        completedTasks,
        timestamp: new Date().toISOString()
      };

      // Create session in Supabase
      await createSession({
        session_type: 'daily',
        check_date: new Date().toISOString().split('T')[0],
        checklist_responses: checklistResponses,
        notes: notes || null,
        user_id: null,
        family_group: null,
        guest_names: null,
        completed_at: new Date().toISOString()
      });
      
      toast({
        title: "Daily Check-In Completed",
        description: `${completedTasks} tasks completed. Data saved to database.`,
      });

      // Reset form
      setCheckedItems({});
      setReadings({ temperature: "", waterLevel: "", powerUsage: "" });
      setNotes("");
      setDailyOccupancy({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save daily check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2 flex items-center">
            <Clock className="h-10 w-10 mr-3" />
            Daily Cabin Check-In
          </h1>
          <p className="text-lg text-primary-foreground/80">Complete your daily maintenance checklist</p>
        </div>

        <div className="grid gap-6">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Number of people at the cabin
              </CardTitle>
              <CardDescription>Enter the number of people staying each day</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 max-w-2xl">
              {stayDays.map((day) => (
                <div key={day.key} className="space-y-2">
                  <Label htmlFor={day.key}>
                    {day.label}
                  </Label>
                  <Input
                    id={day.key}
                    type="number"
                    placeholder="0"
                    min="0"
                    className="w-20"
                    value={dailyOccupancy[day.key] || ""}
                    onChange={(e) => handleOccupancyChange(day.key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Daily Tasks</CardTitle>
              <CardDescription>Complete these daily maintenance checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={task.id}
                    checked={checkedItems[task.id] || false}
                    onCheckedChange={(checked) => handleCheckChange(task.id, checked as boolean)}
                  />
                  <label htmlFor={task.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {task.label}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Daily Notes</CardTitle>
              <CardDescription>Any observations or issues to report?</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter daily observations, maintenance notes, or issues..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Check-in time: {new Date().toLocaleString()}
                  </span>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary">
                  {isSubmitting ? "Saving..." : "Complete Daily Check-In"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckIn;