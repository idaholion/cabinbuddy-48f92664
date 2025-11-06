import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationLogs } from "@/hooks/useNotificationLogs";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle2, XCircle, AlertCircle, Mail, MessageSquare, RefreshCw } from "lucide-react";

const NotificationMonitoring = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notificationType, setNotificationType] = useState<string>("");
  const [familyGroup, setFamilyGroup] = useState<string>("");

  const { data: logs, isLoading, refetch } = useNotificationLogs({
    startDate,
    endDate,
    notificationType: notificationType || undefined,
    familyGroup: familyGroup || undefined,
  });

  const { familyGroups } = useFamilyGroups();

  const getStatusBadge = (sent: boolean, status: string | null, error: string | null) => {
    if (sent && !error) {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sent</Badge>;
    }
    if (error) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Not Sent</Badge>;
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setNotificationType("");
    setFamilyGroup("");
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notification Monitoring</h1>
          <p className="text-muted-foreground">
            View delivery status for all email and SMS notifications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter notifications by date, type, and family group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notification Type</label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="confirmation">Confirmation</SelectItem>
                    <SelectItem value="cancellation">Cancellation</SelectItem>
                    <SelectItem value="selection_turn_ready">Selection Turn Ready</SelectItem>
                    <SelectItem value="assistance_request">Assistance Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Family Group</label>
                <Select value={familyGroup} onValueChange={setFamilyGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="All groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {familyGroups?.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline">Reset Filters</Button>
              <Button onClick={() => refetch()} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications ({logs?.length || 0})</CardTitle>
            <CardDescription>Last 100 notifications matching your filters</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : logs && logs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Family Group</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SMS</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.sent_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.notification_type}</Badge>
                        </TableCell>
                        <TableCell>{log.family_group || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {log.recipient_email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">{log.recipient_email}</span>
                              </div>
                            )}
                            {log.recipient_phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <MessageSquare className="h-3 w-3" />
                                <span>{log.recipient_phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.email_sent, log.email_status, null)}
                          {log.email_status && (
                            <div className="text-xs text-muted-foreground mt-1">{log.email_status}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.recipient_phone ? (
                            <>
                              {getStatusBadge(log.sms_sent, log.sms_status, log.sms_error)}
                              {log.sms_status && (
                                <div className="text-xs text-muted-foreground mt-1">{log.sms_status}</div>
                              )}
                              {log.sms_error && (
                                <div className="text-xs text-destructive mt-1">{log.sms_error}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.twilio_sid && (
                            <div className="text-xs text-muted-foreground">
                              SID: {log.twilio_sid.substring(0, 10)}...
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No notifications found matching your filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default NotificationMonitoring;
