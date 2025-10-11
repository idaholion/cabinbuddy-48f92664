import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, Clock, Send, FileText } from "lucide-react";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const InvoiceSettings = () => {
  const { settings, loading, saveFinancialSettings } = useFinancialSettings();
  const { toast } = useToast();

  // Reminder Settings
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminder7Days, setReminder7Days] = useState(true);
  const [reminder3Days, setReminder3Days] = useState(true);
  const [reminder1Day, setReminder1Day] = useState(true);
  const [reminderOnDueDate, setReminderOnDueDate] = useState(true);
  const [overdueReminderInterval, setOverdueReminderInterval] = useState("7");

  // Delivery Settings
  const [emailDeliveryEnabled, setEmailDeliveryEnabled] = useState(true);
  const [smsDeliveryEnabled, setSmsDeliveryEnabled] = useState(false);

  // Email Template Settings
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");

  // Manual Sending Controls
  const [batchSendEnabled, setBatchSendEnabled] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  useEffect(() => {
    if (settings) {
      // Load settings from the database
      setReminderEnabled(settings.auto_invoicing || false);
      // Set default templates if needed
      setEmailSubject(settings.invoice_email_subject || "Invoice {invoice_number} from {organization_name}");
      setEmailBody(settings.invoice_email_body || "Dear {family_group},\n\nPlease find attached your invoice {invoice_number} for the amount of ${total_amount}.\n\nDue date: {due_date}\n\nThank you!");
      setReminderSubject(settings.reminder_email_subject || "Reminder: Invoice {invoice_number} due on {due_date}");
      setReminderBody(settings.reminder_email_body || "Dear {family_group},\n\nThis is a friendly reminder that invoice {invoice_number} for ${balance_due} is due on {due_date}.\n\nThank you!");
    }
  }, [settings]);

  const handleSave = async () => {
    await saveFinancialSettings({
      auto_invoicing: reminderEnabled,
      invoice_email_subject: emailSubject,
      invoice_email_body: emailBody,
      reminder_email_subject: reminderSubject,
      reminder_email_body: reminderBody,
      reminder_7_days_enabled: reminder7Days,
      reminder_3_days_enabled: reminder3Days,
      reminder_1_day_enabled: reminder1Day,
      reminder_due_date_enabled: reminderOnDueDate,
      overdue_reminder_interval_days: parseInt(overdueReminderInterval),
      email_delivery_enabled: emailDeliveryEnabled,
      sms_delivery_enabled: smsDeliveryEnabled,
      batch_send_enabled: batchSendEnabled,
      invoice_approval_required: requireApproval,
    } as any);

    toast({
      title: "Settings Saved",
      description: "Invoice automation settings have been updated.",
    });
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/billing">← Back to Billing</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Invoice Automation</h1>
          <p className="text-2xl text-primary text-center font-medium">Configure automated invoice generation and reminders</p>
        </div>

        <div className="space-y-6 bg-card/95 p-6 rounded-lg">
          {/* Automated Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Automated Reminders
              </CardTitle>
              <CardDescription>Configure when to send automatic invoice reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Automated Reminders</Label>
                  <p className="text-sm text-muted-foreground">Send automatic reminders based on due dates</p>
                </div>
                <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
              </div>

              {reminderEnabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label>7 days before due date</Label>
                      </div>
                      <Switch checked={reminder7Days} onCheckedChange={setReminder7Days} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label>3 days before due date</Label>
                      </div>
                      <Switch checked={reminder3Days} onCheckedChange={setReminder3Days} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label>1 day before due date</Label>
                      </div>
                      <Switch checked={reminder1Day} onCheckedChange={setReminder1Day} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label>On due date</Label>
                      </div>
                      <Switch checked={reminderOnDueDate} onCheckedChange={setReminderOnDueDate} />
                    </div>
                    <div className="space-y-2">
                      <Label>Overdue Reminder Interval</Label>
                      <Select value={overdueReminderInterval} onValueChange={setOverdueReminderInterval}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">Every 3 days</SelectItem>
                          <SelectItem value="7">Every 7 days</SelectItem>
                          <SelectItem value="14">Every 14 days</SelectItem>
                          <SelectItem value="30">Every 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">How often to remind for overdue invoices</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Delivery Methods
              </CardTitle>
              <CardDescription>Choose how invoices and reminders are delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Email Delivery</Label>
                    <p className="text-sm text-muted-foreground">Send invoices via email</p>
                  </div>
                </div>
                <Switch checked={emailDeliveryEnabled} onCheckedChange={setEmailDeliveryEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>SMS Delivery</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via text message</p>
                  </div>
                </div>
                <Switch checked={smsDeliveryEnabled} onCheckedChange={setSmsDeliveryEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Email Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Customize email templates. Available variables: {"{invoice_number}"}, {"{organization_name}"}, {"{family_group}"}, {"{total_amount}"}, {"{balance_due}"}, {"{due_date}"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Invoice Email</h4>
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Invoice {invoice_number} from {organization_name}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Enter email body..."
                    rows={6}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Reminder Email</h4>
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={reminderSubject}
                    onChange={(e) => setReminderSubject(e.target.value)}
                    placeholder="Reminder: Invoice {invoice_number} due on {due_date}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={reminderBody}
                    onChange={(e) => setReminderBody(e.target.value)}
                    placeholder="Enter reminder body..."
                    rows={6}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Sending Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Manual Sending Controls
              </CardTitle>
              <CardDescription>Configure options for manually sending invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Batch Sending</Label>
                  <p className="text-sm text-muted-foreground">Allow sending multiple invoices at once</p>
                </div>
                <Switch checked={batchSendEnabled} onCheckedChange={setBatchSendEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Require Approval</Label>
                  <p className="text-sm text-muted-foreground">Require admin approval before sending invoices</p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/billing">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSettings;
