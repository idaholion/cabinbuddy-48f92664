import { useState } from "react";
import { Mail, Clock, Calendar, Edit, Save, X, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ReminderTemplate {
  id: string;
  reminder_type: string;
  subject_template: string;
  custom_message: string;
  checklist_items: string[];
  is_active: boolean;
  days_in_advance: number;
}

export const ReminderTemplateManager = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([
    {
      id: '1',
      reminder_type: 'stay_7_day',
      subject_template: 'Cabin Reservation Reminder - 7 days to go!',
      custom_message: `Hi {{guest_name}},

Your cabin reservation is in 7 days! Time to start getting excited and prepared.

**Reservation Details:**
• Family Group: {{family_group_name}}
• Check-in: {{check_in_date}}
• Check-out: {{check_out_date}}

We're looking forward to your stay!

Best regards,
{{organization_name}} Team`,
      checklist_items: [
        'Review shopping list and coordinate with other families',
        'Check weather forecast for packing',
        'Share guest information packet with friends/family joining',
        'Review cabin rules and policies',
        'Plan transportation and confirm directions'
      ],
      is_active: true,
      days_in_advance: 7
    },
    {
      id: '2',
      reminder_type: 'stay_3_day',
      subject_template: 'Cabin Reservation Reminder - 3 days to go!',
      custom_message: `Hi {{guest_name}},

Your cabin stay is just 3 days away! Here are some final preparations to ensure a smooth arrival.

**Reservation Details:**
• Family Group: {{family_group_name}}
• Check-in: {{check_in_date}}
• Check-out: {{check_out_date}}

Don't forget to confirm your arrival time if needed!

Best regards,
{{organization_name}} Team`,
      checklist_items: [
        'Final review of shopping list',
        'Confirm arrival time with calendar keeper if needed',
        'Pack according to weather forecast',
        'Double-check emergency contact information',
        'Review check-in procedures'
      ],
      is_active: true,
      days_in_advance: 3
    },
    {
      id: '3',
      reminder_type: 'stay_1_day',
      subject_template: 'Cabin Reservation Reminder - Tomorrow!',
      custom_message: `Hi {{guest_name}},

Your cabin stay is tomorrow! We hope you're all packed and ready for a wonderful time.

**Reservation Details:**
• Family Group: {{family_group_name}}
• Check-in: {{check_in_date}}
• Check-out: {{check_out_date}}

Safe travels and enjoy your stay!

Best regards,
{{organization_name}} Team`,
      checklist_items: [
        'Final weather check and packing adjustments',
        'Confirm departure time and route',
        'Ensure all guests have cabin address and WiFi info',
        'Last-minute coordination with other families',
        'Emergency contacts saved in phone'
      ],
      is_active: true,
      days_in_advance: 1
    },
    {
      id: '4',
      reminder_type: 'selection_period_start',
      subject_template: 'Calendar Selection Period Now Open',
      custom_message: `Hi {{guest_name}},

The calendar selection period for {{selection_year}} is now open! It's time to select your preferred cabin dates.

**Selection Details:**
• Your turn starts: {{selection_start_date}}
• Selection deadline: {{selection_end_date}}
• Available periods: {{available_periods}}

Please log into the system to make your selections as soon as possible.

Best regards,
{{organization_name}} Calendar Keeper`,
      checklist_items: [
        'Review available time periods',
        'Coordinate with family group members',
        'Consider seasonal preferences and activities',
        'Submit selections before deadline',
        'Contact calendar keeper with any questions'
      ],
      is_active: true,
      days_in_advance: 0
    },
    {
      id: '5',
      reminder_type: 'selection_period_ending',
      subject_template: 'Selection Period Ends Tomorrow - Final Reminder',
      custom_message: `Hi {{guest_name}},

Your calendar selection period for {{selection_year}} ends TOMORROW! 

**Important Deadline Information:**
• Selection deadline: {{selection_end_date}}
• You have until end of day to complete your selections
• Currently selected periods: {{current_selections}}
• Remaining selections allowed: {{remaining_selections}}

If you don't complete your selections by the deadline, you'll miss your opportunity for this rotation year.

**Action Required:** Please log in immediately to finalize your cabin date selections.

Best regards,
{{organization_name}} Calendar Keeper`,
      checklist_items: [
        'Log into the system immediately',
        'Review your current selections',
        'Complete any remaining time period selections',
        'Confirm all selections are submitted',
        'Contact calendar keeper if you need assistance',
        'Remember: deadline is end of day tomorrow'
      ],
      is_active: false,
      days_in_advance: 1
    }
  ]);

  const updateTemplate = (templateId: string, updates: Partial<ReminderTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId ? { ...template, ...updates } : template
    ));
    setHasUnsavedChanges(true);
  };

  const handleSaveReminders = () => {
    // Here you would typically save to the database
    setHasUnsavedChanges(false);
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Reminder templates saved successfully",
    });
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        setIsEditing(false);
        setHasUnsavedChanges(false);
        // Reload templates from saved state
        window.location.reload();
      }
    } else {
      setIsEditing(false);
    }
  };

  const getTemplateIcon = (type: string) => {
    if (type.includes('selection')) return <Calendar className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getTemplateTitle = (type: string) => {
    switch (type) {
      case 'stay_7_day': return '7-Day Stay Reminder';
      case 'stay_3_day': return '3-Day Stay Reminder';
      case 'stay_1_day': return '1-Day Stay Reminder';
      case 'selection_period_start': return 'Selection Period Start';
      case 'selection_period_ending': return 'Selection Period Ending Tomorrow';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Reminder Templates</h3>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Edit Reminders</span>
            </Button>
          ) : (
            <>
              <Button onClick={handleCancelEdit} variant="outline" className="flex items-center space-x-2">
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button 
                onClick={handleSaveReminders} 
                disabled={!hasUnsavedChanges}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Reminders</span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isEditing && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 text-yellow-800">
            <Settings className="h-4 w-4" />
            <span className="font-medium">Edit Mode Active</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            You can now modify reminder templates. Don't forget to save your changes!
          </p>
        </div>
      )}

      <div className="text-base text-muted-foreground">{isEditing ? "Editing reminder templates. " : ""}Customize the content of reminder notifications. Available variables: 
        {"{{guest_name}}, {{family_group_name}}, {{check_in_date}}, {{check_out_date}}, {{organization_name}}, {{selection_year}}, {{selection_start_date}}, {{selection_end_date}}, {{available_periods}}, {{current_selections}}, {{remaining_selections}}"}
      </div>

      <div className="space-y-6">
        {templates.map((template) => (
          <Card key={template.id} className={`${!template.is_active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTemplateIcon(template.reminder_type)}
                  <CardTitle className="text-base">{getTemplateTitle(template.reminder_type)}</CardTitle>
                  {!template.is_active && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Disabled</span>
                  )}
                </div>
                {isEditing && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`active-${template.id}`} className="text-sm">Active</Label>
                      <Switch
                        id={`active-${template.id}`}
                        checked={template.is_active}
                        onCheckedChange={(checked) => updateTemplate(template.id, { is_active: checked })}
                      />
                    </div>
                    {template.reminder_type.includes('stay_') && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`days-${template.id}`} className="text-sm">Days in advance</Label>
                        <Select 
                          value={template.days_in_advance.toString()} 
                          onValueChange={(value) => updateTemplate(template.id, { days_in_advance: parseInt(value) })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="14">14</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`subject-${template.id}`} className="text-base">Email Subject</Label>
                <Textarea
                  id={`subject-${template.id}`}
                  value={template.subject_template}
                  onChange={(e) => isEditing && updateTemplate(template.id, { subject_template: e.target.value })}
                  className="mt-1 text-base"
                  rows={1}
                  readOnly={!isEditing}
                />
              </div>
              
              <div>
                <Label htmlFor={`content-${template.id}`} className="text-base">Email Content</Label>
                <Textarea
                  id={`content-${template.id}`}
                  value={template.custom_message}
                  onChange={(e) => isEditing && updateTemplate(template.id, { custom_message: e.target.value })}
                  className="mt-1 text-base"
                  rows={8}
                  readOnly={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor={`checklist-${template.id}`} className="text-base">Checklist Items (one per line)</Label>
                <Textarea
                  id={`checklist-${template.id}`}
                  value={template.checklist_items.join('\n')}
                  onChange={(e) => isEditing && updateTemplate(template.id, { 
                    checklist_items: e.target.value.split('\n').filter(item => item.trim()) 
                  })}
                  className="mt-1 text-base"
                  rows={5}
                  placeholder="Enter checklist items, one per line..."
                  readOnly={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};