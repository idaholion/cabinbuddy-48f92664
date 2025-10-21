import { useState, useEffect } from "react";
import { Mail, Clock, Calendar, Edit, Save, X, Settings, ToggleLeft, ToggleRight, Plus, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRobustMultiOrganization } from "@/hooks/useRobustMultiOrganization";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ReminderTemplate {
  id: string;
  reminder_type: string;
  subject_template: string;
  custom_message: string;
  checklist_items: string[];
  sms_message_template: string | null;
  is_active: boolean;
  days_in_advance: number | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export const ReminderTemplateManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [newTemplateType, setNewTemplateType] = useState("");

  // Fetch templates from database
  useEffect(() => {
    if (activeOrganization?.organization_id) {
      fetchTemplates();
    }
  }, [activeOrganization?.organization_id]);

  const fetchTemplates = async () => {
    if (!activeOrganization?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('reminder_templates')
        .select('*')
        .eq('organization_id', activeOrganization.organization_id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Convert JSONB checklist_items back to string array and handle missing fields
      const templatesWithArrays = (data || []).map((template: any) => ({
        ...template,
        checklist_items: Array.isArray(template.checklist_items) 
          ? template.checklist_items as string[]
          : [],
        is_active: template.is_active ?? true,
        days_in_advance: template.days_in_advance ?? null,
        sms_message_template: template.sms_message_template ?? null
      }));

      setTemplates(templatesWithArrays);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load reminder templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = (templateId: string, updates: Partial<ReminderTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId ? { ...template, ...updates } : template
    ));
  };

  const addNewTemplate = () => {
    if (!newTemplateType.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template type",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: ReminderTemplate = {
      id: 'new-' + Date.now(),
      reminder_type: newTemplateType.toLowerCase().replace(/\s+/g, '_'),
      subject_template: `${newTemplateType} Reminder`,
      custom_message: `Hi {{recipient_name}},\n\nThis is a reminder about the upcoming ${newTemplateType}.\n\nBest regards,\n{{organization_name}} Team`,
      checklist_items: [],
      sms_message_template: null,
      is_active: true,
      days_in_advance: 7,
      organization_id: activeOrganization?.organization_id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setTemplates(prev => [...prev, newTemplate]);
    setNewTemplateType("");
  };

  const deleteTemplate = (templateId: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      setTemplates(prev => prev.filter(template => template.id !== templateId));
    }
  };

  const handleSaveReminders = async () => {
    if (!activeOrganization?.organization_id || !user?.id) return;

    setSaving(true);
    try {
      // Separate new templates from existing ones
      const newTemplates = templates.filter(t => t.id.startsWith('new-'));
      const existingTemplates = templates.filter(t => !t.id.startsWith('new-'));

      // Insert new templates
      for (const template of newTemplates) {
        const { error } = await supabase
          .from('reminder_templates')
          .insert({
            organization_id: activeOrganization.organization_id,
            reminder_type: template.reminder_type,
            subject_template: template.subject_template,
            custom_message: template.custom_message,
            checklist_items: template.checklist_items,
            sms_message_template: template.sms_message_template,
            is_active: template.is_active,
            days_in_advance: template.days_in_advance,
            created_by_user_id: user.id
          });

        if (error) throw error;
      }

      // Update existing templates
      for (const template of existingTemplates) {
        const { error } = await supabase
          .from('reminder_templates')
          .update({
            subject_template: template.subject_template,
            custom_message: template.custom_message,
            checklist_items: template.checklist_items,
            sms_message_template: template.sms_message_template,
            is_active: template.is_active,
            days_in_advance: template.days_in_advance
          })
          .eq('id', template.id);

        if (error) throw error;
      }

      // Delete templates that were removed (check if any in database don't exist in current list)
      const currentIds = existingTemplates.map(t => t.id);
      const { data: dbTemplates } = await supabase
        .from('reminder_templates')
        .select('id')
        .eq('organization_id', activeOrganization.organization_id);

      const deletedIds = (dbTemplates || [])
        .filter(db => !currentIds.includes(db.id))
        .map(db => db.id);

      if (deletedIds.length > 0) {
        const { error } = await supabase
          .from('reminder_templates')
          .delete()
          .in('id', deletedIds);

        if (error) throw error;
      }

      await fetchTemplates(); // Refresh from database
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Reminder templates saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving templates:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save reminder templates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
      setIsEditing(false);
      fetchTemplates(); // Reload from database
    }
  };

  const getTemplateIcon = (type: string) => {
    if (type === 'password_reset') return <KeyRound className="h-4 w-4" />;
    if (type.includes('selection') || type.includes('calendar')) return <Calendar className="h-4 w-4" />;
    if (type.includes('work') || type.includes('weekend')) return <Settings className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getTemplateTitle = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!activeOrganization?.organization_id) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Select an Organization</h3>
          <p className="text-muted-foreground">Please select an organization to manage reminder templates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Reminder Templates</h3>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center space-x-2 hover:scale-105 hover:shadow-lg hover:border-primary/50 transition-all duration-200 ease-in-out">
              <Edit className="h-4 w-4" />
              <span>Edit Reminders</span>
            </Button>
          ) : (
            <>
              <Button onClick={handleCancelEdit} variant="outline" className="flex items-center space-x-2 hover:scale-105 hover:shadow-md hover:bg-destructive/5 hover:border-destructive/30 transition-all duration-200">
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button 
                onClick={handleSaveReminders} 
                disabled={saving}
                className="flex items-center space-x-2 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isEditing && (
        <>
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center space-x-2 text-warning-foreground">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Edit Mode Active</span>
            </div>
            <p className="text-sm text-warning-foreground/80 mt-1">
              You can now modify reminder templates. Don't forget to save your changes!
            </p>
          </div>

          {/* Add New Template Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add New Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Template type (e.g., Work Weekend, Annual Meeting)"
                  value={newTemplateType}
                  onChange={(e) => setNewTemplateType(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addNewTemplate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="text-base text-muted-foreground">
        {isEditing ? "Editing reminder templates. " : ""}Customize the content of email and SMS reminder notifications. Available variables: 
        {"{{guest_name}}, {{family_group_name}}, {{check_in_date}}, {{check_out_date}}, {{organization_name}}, {{selection_year}}, {{work_weekend_date}}, {{participant_name}}, {{coordinator_name}}, {{start_time}}, {{location}}"}
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
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Disabled</span>
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
                    {(template.reminder_type.includes('stay_') || template.reminder_type.includes('work_')) && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`days-${template.id}`} className="text-sm">Days in advance</Label>
                        <Select 
                          value={(template.days_in_advance || 7).toString()} 
                          onValueChange={(value) => updateTemplate(template.id, { days_in_advance: parseInt(value) })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="7" />
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
                    <Button 
                      onClick={() => deleteTemplate(template.id)}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor={`sms-${template.id}`} className="text-base">SMS Message Template (Optional)</Label>
                  <span className={`text-sm ${(template.sms_message_template?.length || 0) > 160 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {template.sms_message_template?.length || 0}/160 chars
                    {(template.sms_message_template?.length || 0) > 160 && ` (${Math.ceil((template.sms_message_template?.length || 0) / 160)} messages)`}
                  </span>
                </div>
                <Textarea
                  id={`sms-${template.id}`}
                  value={template.sms_message_template || ''}
                  onChange={(e) => isEditing && updateTemplate(template.id, { 
                    sms_message_template: e.target.value || null
                  })}
                  className="mt-1 text-base"
                  rows={3}
                  placeholder="Short SMS message (160 chars for single SMS). Leave empty to use default. Variables: {{guest_name}}, {{family_group_name}}, etc."
                  readOnly={!isEditing}
                  maxLength={480}
                />
                {(template.sms_message_template?.length || 0) > 160 && (
                  <p className="text-sm text-warning mt-1">
                    ⚠️ Messages over 160 characters will be sent as multiple SMS (costs more)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};