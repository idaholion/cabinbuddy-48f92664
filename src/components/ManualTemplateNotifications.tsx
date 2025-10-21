import { useState, useEffect } from "react";
import { Send, Users, Mail, Calendar, CheckCircle, AlertCircle, Clock, Eye, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRobustMultiOrganization } from "@/hooks/useRobustMultiOrganization";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import { useSequentialSelection } from "@/hooks/useSequentialSelection";

interface ReminderTemplate {
  id: string;
  reminder_type: string;
  subject_template: string;
  custom_message: string;
  checklist_items: string[];
  is_active: boolean;
  organization_id: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
}

interface TemplateVariable {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'date' | 'time';
}

export const ManualTemplateNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  const { loading: sendingEmail, execute: executeSend } = useAsyncOperation({
    successMessage: "Email sent successfully!",
    errorMessage: "Failed to send email"
  });
  
  // Get current rotation year for selections (selections in Oct 2025 are for 2026 reservations)
  const getCurrentRotationYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (October = 9)
    
    // If we're in October or later, selections are for next year's reservations
    const selectionStartMonth = 9; // October (0-based)
    
    if (currentMonth >= selectionStartMonth) {
      return currentYear + 1; // Selections for next year
    }
    return currentYear; // Selections for current year
  };
  
  const rotationYear = getCurrentRotationYear();
  const { currentFamilyGroup, getDaysRemaining } = useSequentialSelection(rotationYear);

  // State management
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipientType, setRecipientType] = useState<'all_families' | 'selected_families' | 'custom_emails'>('all_families');
  const [selectedFamilyGroups, setSelectedFamilyGroups] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState("");
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (activeOrganization?.organization_id) {
      loadData();
    }
  }, [activeOrganization?.organization_id]);

  // Update template variables when template changes
  useEffect(() => {
    if (selectedTemplateId) {
      updateTemplateVariables();
    }
  }, [selectedTemplateId]);

  const loadData = async () => {
    if (!activeOrganization?.organization_id) return;

    try {
      setLoading(true);

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('reminder_templates')
        .select('*')
        .eq('organization_id', activeOrganization.organization_id)
        .eq('is_active', true)
        .order('reminder_type');

      if (templatesError) throw templatesError;

      // Load family groups
      const { data: familyGroupsData, error: familyGroupsError } = await supabase
        .from('family_groups')
        .select('id, name, lead_name, lead_email, lead_phone')
        .eq('organization_id', activeOrganization.organization_id)
        .order('name');

      if (familyGroupsError) throw familyGroupsError;

      setTemplates((templatesData || []).map(template => ({
        ...template,
        checklist_items: Array.isArray(template.checklist_items) 
          ? template.checklist_items as string[]
          : []
      })));
      setFamilyGroups(familyGroupsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load templates and family groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateVariables = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    // Extract variables from template content
    const content = template.subject_template + ' ' + template.custom_message;
    const variableMatches = content.match(/{{([^}]+)}}/g) || [];
    const uniqueVariables = [...new Set(variableMatches.map(match => match.slice(2, -2)))];

    const variables: TemplateVariable[] = uniqueVariables.map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: getDefaultVariableValue(key),
      type: getVariableType(key)
    }));

    setTemplateVariables(variables);
  };

  const getDefaultVariableValue = (key: string): string => {
    switch (key) {
      case 'organization_name':
        return activeOrganization?.organization_name || '';
      case 'recipient_name':
        return 'Family Group Lead';
      case 'family_group_name':
        // Use actual current family if it's a selection notification
        return currentFamilyGroup || 'Your Family Group';
      case 'current_family_group':
        return currentFamilyGroup || '';
      case 'days_remaining':
        return currentFamilyGroup ? String(getDaysRemaining(currentFamilyGroup)) : '';
      default:
        return '';
    }
  };

  const getVariableType = (key: string): 'text' | 'date' | 'time' => {
    if (key.includes('date')) return 'date';
    if (key.includes('time')) return 'time';
    return 'text';
  };

  const updateVariableValue = (key: string, value: string) => {
    setTemplateVariables(prev => 
      prev.map(variable => 
        variable.key === key ? { ...variable, value } : variable
      )
    );
  };

  const getSelectedTemplate = () => templates.find(t => t.id === selectedTemplateId);

  const getRecipientList = () => {
    switch (recipientType) {
      case 'all_families':
        return familyGroups.filter(fg => fg.lead_email).map(fg => ({
          name: fg.lead_name,
          email: fg.lead_email,
          familyGroup: fg.name
        }));
      case 'selected_families':
        return familyGroups
          .filter(fg => selectedFamilyGroups.includes(fg.id) && fg.lead_email)
          .map(fg => ({
            name: fg.lead_name,
            email: fg.lead_email,
            familyGroup: fg.name
          }));
      case 'custom_emails':
        return customEmails
          .split('\n')
          .map(line => line.trim())
          .filter(email => email && email.includes('@'))
          .map(email => ({
            name: email.split('@')[0],
            email: email,
            familyGroup: 'Custom Recipient'
          }));
      default:
        return [];
    }
  };

  const generatePreviewContent = () => {
    const template = getSelectedTemplate();
    if (!template) return { subject: '', content: '' };

    const variableMap = templateVariables.reduce((acc, variable) => ({
      ...acc,
      [variable.key]: variable.value
    }), {} as Record<string, string>);

    // Replace variables in subject and content
    let subject = template.subject_template;
    let content = template.custom_message;

    Object.entries(variableMap).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      content = content.replace(regex, value);
    });

    // Add checklist items if they exist
    if (template.checklist_items && template.checklist_items.length > 0) {
      content += '\n\nCHECKLIST ITEMS:\n';
      template.checklist_items.forEach(item => {
        content += `• ${item}\n`;
      });
    }

    return { subject, content };
  };

  const handleSend = async () => {
    if (!selectedTemplateId || !activeOrganization?.organization_id || !user?.id) {
      toast({
        title: "Error",
        description: "Please select a template and ensure you're logged in",
        variant: "destructive",
      });
      return;
    }

    const recipients = getRecipientList();
    if (recipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    await executeSend(async () => {
      const template = getSelectedTemplate();
      if (!template) throw new Error('Template not found');

      const variableMap = templateVariables.reduce((acc, variable) => ({
        ...acc,
        [variable.key]: variable.value
      }), {} as Record<string, string>);

      const { subject, content } = generatePreviewContent();

      // Log the manual send
      const { error: logError } = await supabase
        .from('manual_template_sends')
        .insert({
          organization_id: activeOrganization.organization_id,
          template_id: selectedTemplateId,
          sent_by_user_id: user.id,
          recipient_type: recipientType,
          recipients: recipients,
          template_variables: variableMap,
          email_subject: subject,
          email_content: content,
          total_recipients: recipients.length,
          successful_sends: 0,
          failed_sends: 0
        });

      if (logError) throw logError;

      // Send emails via edge function
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'manual_template',
          organization_id: activeOrganization.organization_id,
          template: {
            id: selectedTemplateId,
            subject_template: subject,
            custom_message: content,
            checklist_items: template.checklist_items || []
          },
          recipients: recipients,
          template_variables: variableMap
        }
      });

      if (error) throw error;

      // Reset form
      setSelectedTemplateId("");
      setRecipientType('all_families');
      setSelectedFamilyGroups([]);
      setCustomEmails("");
      setTemplateVariables([]);
      setPreviewMode(false);

      return data;
    });
  };

  const getTemplateTitle = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isFormValid = () => {
    return selectedTemplateId && getRecipientList().length > 0;
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Manual Notifications</h3>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Send Immediately</span>
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        Send custom template notifications to family groups or specific email addresses. Perfect for announcements, meetings, and special events.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Notification Setup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template-select">Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a notification template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {getTemplateTitle(template.reminder_type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Type */}
            <div>
              <Label htmlFor="recipient-type">Recipients</Label>
              <Select value={recipientType} onValueChange={(value: any) => setRecipientType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_families">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>All Family Groups</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="selected_families">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Selected Family Groups</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom_emails">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Custom Email Addresses</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Family Group Selection */}
            {recipientType === 'selected_families' && (
              <div>
                <Label>Select Family Groups</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {familyGroups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedFamilyGroups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFamilyGroups([...selectedFamilyGroups, group.id]);
                          } else {
                            setSelectedFamilyGroups(selectedFamilyGroups.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <Label htmlFor={`group-${group.id}`} className="text-sm">
                        {group.name} ({group.lead_name})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Emails */}
            {recipientType === 'custom_emails' && (
              <div>
                <Label htmlFor="custom-emails">Email Addresses (one per line)</Label>
                <Textarea
                  id="custom-emails"
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  rows={4}
                />
              </div>
            )}

            {/* Template Variables */}
            {templateVariables.length > 0 && (
              <div>
                <Label>Template Variables</Label>
                <div className="space-y-3 border rounded-md p-3">
                  {templateVariables.map((variable) => (
                    <div key={variable.key}>
                      <Label htmlFor={`var-${variable.key}`} className="text-sm">
                        {variable.label}
                      </Label>
                      {variable.type === 'date' ? (
                        <Input
                          id={`var-${variable.key}`}
                          type="date"
                          value={variable.value}
                          onChange={(e) => updateVariableValue(variable.key, e.target.value)}
                        />
                      ) : variable.type === 'time' ? (
                        <Input
                          id={`var-${variable.key}`}
                          type="time"
                          value={variable.value}
                          onChange={(e) => updateVariableValue(variable.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          id={`var-${variable.key}`}
                          value={variable.value}
                          onChange={(e) => updateVariableValue(variable.key, e.target.value)}
                          placeholder={`Enter ${variable.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </div>
              {selectedTemplateId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? 'Hide Preview' : 'Show Preview'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient Count */}
            {selectedTemplateId && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Recipients</span>
                </div>
                <Badge variant="secondary">
                  {getRecipientList().length} recipients
                </Badge>
              </div>
            )}

            {/* Email Preview */}
            {previewMode && selectedTemplateId && (
              <div className="space-y-4">
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Email Subject:</Label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm">
                    {generatePreviewContent().subject || 'No subject'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email Content:</Label>
                  <div className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {generatePreviewContent().content || 'No content'}
                  </div>
                </div>
              </div>
            )}

            {/* Send Button */}
            <div className="pt-4">
              <Button
                onClick={handleSend}
                disabled={!isFormValid() || sendingEmail}
                className="w-full"
                size="lg"
              >
                {sendingEmail ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
              
              {!isFormValid() && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please select a template and at least one recipient</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};