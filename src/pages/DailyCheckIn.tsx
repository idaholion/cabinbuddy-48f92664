import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Thermometer, Droplets, Zap, Users, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { useCheckinSessions } from "@/hooks/useChecklistData";
import { useReservations } from "@/hooks/useReservations";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useAuth } from "@/contexts/AuthContext";

const DailyCheckIn = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createSession } = useCheckinSessions();
  const { reservations } = useReservations();
  const { familyGroups } = useFamilyGroups();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [readings, setReadings] = useState({
    temperature: "",
    waterLevel: "",
    powerUsage: ""
  });
  const [notes, setNotes] = useState("");
  const [dailyOccupancy, setDailyOccupancy] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentReservation, setCurrentReservation] = useState<any>(null);

  // Find user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email === user?.email)
  )?.name;

  // Find current active reservation for the user
  useEffect(() => {
    if (!userFamilyGroup || !reservations.length) {
      setCurrentReservation(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeReservation = reservations.find(reservation => {
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      return reservation.family_group === userFamilyGroup &&
             today >= startDate && today <= endDate;
    });

    setCurrentReservation(activeReservation);
  }, [userFamilyGroup, reservations]);

  // Generate days for the current reservation (or empty if no reservation)
  const stayDays = currentReservation ? (() => {
    const startDate = new Date(currentReservation.start_date);
    const endDate = new Date(currentReservation.end_date);
    const days = [];
    
    const currentDate = new Date(startDate);
    let dayNumber = 1;
    
    while (currentDate <= endDate) {
      days.push({
        key: `day-${dayNumber}`,
        label: `Day ${dayNumber} (${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
      });
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }
    
    return days;
  })() : [];

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
        user_id: user?.id || null,
        family_group: userFamilyGroup || null,
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
        <PageHeader 
          title="Daily Cabin Check-In"
          subtitle="Complete your daily maintenance checklist"
          icon={Clock}
          backgroundImage={true}
        >
          <NavigationHeader />
        </PageHeader>

        <div className="grid gap-6">
          {/* Current Reservation Status */}
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Current Reservation Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentReservation ? (
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <div>
                    <div className="font-semibold text-primary">
                      Active Reservation: {userFamilyGroup}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(currentReservation.start_date).toLocaleDateString()} - {new Date(currentReservation.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stayDays.length} day{stayDays.length !== 1 ? 's' : ''} total
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-semibold text-muted-foreground">
                      No Active Reservation
                    </div>
                    <div className="text-sm text-muted-foreground">
                      You don't have an active reservation for today. Daily check-in is only available during your reservation period.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Only show occupancy tracking if there's an active reservation */}
          {currentReservation && stayDays.length > 0 && (
            <Card className="bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Guest Occupancy Tracking
                </CardTitle>
                <CardDescription>
                  Track the number of people staying each day. You can fill this out day by day as you go, 
                  or complete it all at once - whatever works best for you. You can always come back and update it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Helpful info box */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> You don't need to fill out everything at once! You can:
                    <ul className="mt-1 ml-4 list-disc space-y-1">
                      <li>Fill out just today and come back tomorrow for the next day</li>
                      <li>Complete your entire stay in advance if you know your plans</li>
                      <li>Update or add information any time during your reservation</li>
                    </ul>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 max-w-2xl">
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
                </div>
              </CardContent>
            </Card>
          )}

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
                  {isSubmitting ? "Saving..." : "Save Check-In Data"}
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