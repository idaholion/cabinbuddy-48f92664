import { useState } from "react";
import { Mail, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ReminderTemplate {
  id: string;
  template_name: string;
  subject: string;
  content: string;
  is_active: boolean;
}

export const ReminderTemplateManager = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReminderTemplate[]>([
    {
      id: '1',
      template_name: 'Upcoming Stay Reminder',
      subject: 'Upcoming Cabin Stay - Important Information',
      content: `Dear {{family_name}},

Your cabin stay is coming up on {{check_in_date}}. Here are some important reminders:

• Check-in time: 3:00 PM
• Check-out time: 11:00 AM
• Please review the cabin rules before your arrival
• Contact us if you have any questions

We hope you have a wonderful stay!

Best regards,
{{organization_name}} Calendar Keeper`,
      is_active: true
    },
    {
      id: '2',
      template_name: 'Work Weekend Reminder',
      subject: 'Work Weekend Reminder - {{work_date}}',
      content: `Hello {{family_name}},

This is a reminder about the upcoming work weekend on {{work_date}}.

• Start time: 9:00 AM
• Please bring appropriate work clothes
• Lunch will be provided
• Contact the calendar keeper if you cannot attend

Thank you for your participation!

{{organization_name}} Calendar Keeper`,
      is_active: true
    }
  ]);

  const updateTemplate = (templateId: string, updates: Partial<ReminderTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId ? { ...template, ...updates } : template
    ));

    toast({
      title: "Success",
      description: "Template updated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Mail className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Reminder Templates</h3>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Customize the content of reminder notifications sent to families. Available variables: 
        {"{{family_name}}, {{check_in_date}}, {{check_out_date}}, {{work_date}}, {{organization_name}}"}
      </div>

      <div className="space-y-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {template.template_name.includes('Work') ? (
                    <Calendar className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  <CardTitle className="text-base">{template.template_name}</CardTitle>
                </div>
                <Button
                  variant={template.is_active ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateTemplate(template.id, { is_active: !template.is_active })}
                >
                  {template.is_active ? "Active" : "Inactive"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`subject-${template.id}`}>Email Subject</Label>
                <Textarea
                  id={`subject-${template.id}`}
                  value={template.subject}
                  onChange={(e) => updateTemplate(template.id, { subject: e.target.value })}
                  className="mt-1"
                  rows={1}
                />
              </div>
              
              <div>
                <Label htmlFor={`content-${template.id}`}>Email Content</Label>
                <Textarea
                  id={`content-${template.id}`}
                  value={template.content}
                  onChange={(e) => updateTemplate(template.id, { content: e.target.value })}
                  className="mt-1"
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};