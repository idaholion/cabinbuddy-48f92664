import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Thermometer, Droplets, Zap, Users, Calendar, Edit3, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { useCheckinSessions } from "@/hooks/useChecklistData";
import { useReservations } from "@/hooks/useReservations";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";
const DailyCheckIn = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createSession, updateSession, sessions, refetch: refetchSessions } = useCheckinSessions();
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
  const [existingSession, setExistingSession] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { isAdmin } = useOrgAdmin();
  const [newItemLabel, setNewItemLabel] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [dailyTasks, setDailyTasks] = useState([
    { id: "security", label: "Checked all doors and windows locked", category: "security" },
    { id: "cleanliness", label: "Maintained cleanliness standards", category: "maintenance" },
    { id: "appliances", label: "All appliances functioning properly", category: "maintenance" },
    { id: "heating", label: "Heating/cooling system operational", category: "utilities" },
    { id: "plumbing", label: "No plumbing issues detected", category: "utilities" },
    { id: "wifi", label: "Internet connection stable", category: "utilities" },
  ]);

  // Find user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email?.toLowerCase() === user?.email?.toLowerCase())
  )?.name;

  // Check admin status and load saved daily tasks
  useEffect(() => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      const savedDailyTasks = localStorage.getItem(`daily_tasks_${organizationCode}`);
      if (savedDailyTasks) {
        setDailyTasks(JSON.parse(savedDailyTasks));
      }
    }
  }, []);
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

  // Load existing session data when we have current reservation and sessions
  useEffect(() => {
    if (!currentReservation || !userFamilyGroup || !sessions.length) return;

    // Find existing session for this reservation period
    const existingDailySession = sessions.find(session => 
      session.session_type === 'daily' &&
      session.family_group === userFamilyGroup &&
      session.check_date >= currentReservation.start_date &&
      session.check_date <= currentReservation.end_date
    );

    if (existingDailySession) {
      setExistingSession(existingDailySession);
      
      // Load the existing data into the form
      const responses = existingDailySession.checklist_responses;
      if (responses) {
        if (responses.tasks) setCheckedItems(responses.tasks);
        if (responses.readings) setReadings(responses.readings);
        if (responses.dailyOccupancy) setDailyOccupancy(responses.dailyOccupancy);
      }
      if (existingDailySession.notes) setNotes(existingDailySession.notes);
    } else {
      setExistingSession(null);
    }
  }, [currentReservation, userFamilyGroup, sessions]);

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

  const saveDailyTasks = () => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      localStorage.setItem(`daily_tasks_${organizationCode}`, JSON.stringify(dailyTasks));
      toast({
        title: "Daily Tasks Saved",
        description: "Daily task list has been saved for your organization.",
      });
    }
  };

  const addNewTask = () => {
    if (newItemLabel.trim()) {
      const newTask = {
        id: `custom_${Date.now()}`,
        label: newItemLabel.trim(),
        category: "custom"
      };
      setDailyTasks(prev => [...prev, newTask]);
      setNewItemLabel("");
      saveDailyTasks();
    }
  };

  const deleteTask = (taskId: string) => {
    setDailyTasks(prev => prev.filter(task => task.id !== taskId));
    saveDailyTasks();
    toast({
      title: "Task Deleted",
      description: "Daily task has been removed.",
    });
  };

  const startEditTask = (task: any) => {
    setEditingItemId(task.id);
    setEditingLabel(task.label);
  };

  const saveEditTask = () => {
    if (editingLabel.trim() && editingItemId) {
      setDailyTasks(prev => 
        prev.map(task => 
          task.id === editingItemId 
            ? { ...task, label: editingLabel.trim() }
            : task
        )
      );
      setEditingItemId(null);
      setEditingLabel("");
      saveDailyTasks();
      toast({
        title: "Task Updated",
        description: "Daily task has been updated.",
      });
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingLabel("");
  };

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

      if (existingSession) {
        // Update existing session
        await updateSession(existingSession.id, {
          checklist_responses: checklistResponses,
          notes: notes || null,
          completed_at: new Date().toISOString()
        });
        
        toast({
          title: "Check-In Data Updated",
          description: `${completedTasks} tasks completed. Your data has been updated successfully.`,
        });
      } else {
        // Create new session
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
          title: "Daily Check-In Saved",
          description: `${completedTasks} tasks completed. Data saved to database.`,
        });
      }

      // Refresh sessions to get the updated data
      await refetchSessions();
      
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
                    {existingSession && (
                      <div className="text-sm text-green-600 mt-2">
                        ✓ You have saved check-in data (last updated: {new Date(existingSession.completed_at || existingSession.created_at).toLocaleDateString()})
                      </div>
                    )}
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

          {/* Show occupancy tracking - functional if active reservation, preview if not */}
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Guest Occupancy Tracking
                {!currentReservation && (
                  <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                    Preview Mode
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Track the number of people staying each day. You can fill this out day by day as you go, 
                or complete it all at once - whatever works best for you. You can always come back and update it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!currentReservation && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <strong>📋 Preview:</strong> This shows what the occupancy tracking will look like during your reservation. 
                    The form will be fully functional when you have an active reservation.
                  </div>
                </div>
              )}
              
              {currentReservation && (
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
              )}
              
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 max-w-2xl">
                {(currentReservation ? stayDays : [
                  { key: 'day-1', label: 'Day 1 (Dec 15)' },
                  { key: 'day-2', label: 'Day 2 (Dec 16)' },
                  { key: 'day-3', label: 'Day 3 (Dec 17)' },
                  { key: 'day-4', label: 'Day 4 (Dec 18)' }
                ]).map((day) => (
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
                      value={currentReservation ? (dailyOccupancy[day.key] || "") : ""}
                      onChange={(e) => currentReservation && handleOccupancyChange(day.key, e.target.value)}
                      disabled={!currentReservation}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Daily Tasks
                {!currentReservation && (
                  <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                    Preview Mode
                  </span>
                )}
              </CardTitle>
              <CardDescription>Complete these daily maintenance checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentReservation && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <strong>📋 Preview:</strong> This shows what your daily tasks will look like. 
                    Tasks will be functional during your active reservation.
                  </div>
                </div>
              )}
              
              {dailyTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-3 group">
                  <Checkbox
                    id={task.id}
                    checked={currentReservation ? (checkedItems[task.id] || false) : false}
                    onCheckedChange={(checked) => currentReservation && handleCheckChange(task.id, checked as boolean)}
                    disabled={!currentReservation}
                  />
                  {editingItemId === task.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEditTask();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button onClick={saveEditTask} size="sm" variant="outline">
                        Save
                      </Button>
                      <Button onClick={cancelEdit} size="sm" variant="outline">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <label htmlFor={task.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                        {task.label}
                      </label>
                      {isAdmin && isEditing && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            onClick={() => startEditTask(task)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            onClick={() => deleteTask(task.id)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              
              {isEditing && (
                <div className="flex items-center space-x-2 mt-4">
                  <Input
                    placeholder="Add new daily task..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewTask()}
                  />
                  <Button onClick={addNewTask} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {isAdmin && (
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? "Done Editing" : "Edit Daily Tasks"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Tasks
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Daily Notes
                {!currentReservation && (
                  <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                    Preview Mode
                  </span>
                )}
              </CardTitle>
              <CardDescription>Any observations or issues to report?</CardDescription>
            </CardHeader>
            <CardContent>
              {!currentReservation && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <strong>📋 Preview:</strong> This notes section will be functional during your active reservation.
                  </div>
                </div>
              )}
              <Textarea
                placeholder="Enter daily observations, maintenance notes, or issues..."
                value={currentReservation ? notes : ""}
                onChange={(e) => currentReservation && setNotes(e.target.value)}
                className="min-h-[100px]"
                disabled={!currentReservation}
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
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !currentReservation} 
                  className="bg-primary"
                >
                  {!currentReservation ? "Preview Mode - No Active Reservation" : 
                   isSubmitting ? "Saving..." : "Save Check-In Data"}
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