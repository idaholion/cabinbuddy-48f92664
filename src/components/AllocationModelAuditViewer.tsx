import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, AlertTriangle, CheckCircle, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  organization_id: string;
  old_model: string | null;
  new_model: string | null;
  changed_by_user_id: string | null;
  changed_at: string;
  change_reason: string | null;
  approved_by: string | null;
}

const MODEL_LABELS: Record<string, string> = {
  rotating_selection: "Rotating Selection",
  manual_booking: "Manual Booking",
  static_weeks: "Static Weeks",
};

export function AllocationModelAuditViewer() {
  const { organization } = useOrganization();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchAuditEntries() {
      if (!organization?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("allocation_model_audit")
        .select("*")
        .eq("organization_id", organization.id)
        .order("changed_at", { ascending: false });

      if (error) {
        console.error("Error fetching audit entries:", error);
      } else {
        setAuditEntries(data || []);
        
        // Fetch user emails for display
        const userIds = [...new Set((data || []).map(e => e.changed_by_user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: users } = await supabase.rpc("get_organization_user_emails", {
            org_id: organization.id,
          });
          if (users) {
            const emailMap: Record<string, string> = {};
            users.forEach((u: { user_id: string; email: string }) => {
              emailMap[u.user_id] = u.email;
            });
            setUserEmails(emailMap);
          }
        }
      }
      setLoading(false);
    }

    fetchAuditEntries();
  }, [organization?.id]);

  const getModelLabel = (model: string | null) => {
    if (!model) return "Unknown";
    return MODEL_LABELS[model] || model;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Allocation Model Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Allocation Model Change History
        </CardTitle>
        <CardDescription>
          Audit trail of all allocation model changes for this organization.
          {organization?.is_test_organization && (
            <Badge variant="outline" className="ml-2 text-warning border-warning">
              Test Organization
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {auditEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-4 text-success" />
            <p className="font-medium">No Changes Recorded</p>
            <p className="text-sm">
              The allocation model has not been changed since audit logging was enabled.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(entry.changed_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {entry.changed_by_user_id
                          ? userEmails[entry.changed_by_user_id] || "Unknown User"
                          : "System"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getModelLabel(entry.old_model)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{getModelLabel(entry.new_model)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.change_reason || (
                      <span className="text-muted-foreground italic flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        No reason provided
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
