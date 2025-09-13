import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkWeekends } from '@/hooks/useWorkWeekends';
import { CheckCircle, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

export const WorkWeekendApprovals = () => {
  const { workWeekends, pendingApprovals, loading, approveAsGroupLead } = useWorkWeekends();

  const handleGroupLeadApproval = async (approvalId: string) => {
    await approveAsGroupLead(approvalId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'proposed':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Awaiting Approvals</Badge>;
      case 'fully_approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Lead Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Group Lead Approval Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApprovals.map((approval: any) => {
              const workWeekend = workWeekends.find((ww: any) => ww.id === approval.work_weekend_id);
              if (!workWeekend) return null;

              return (
                <div key={approval.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{workWeekend.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Your group ({approval.family_group}) has reservations during this time
                      </p>
                    </div>
                    <Badge variant="outline">Needs Your Approval</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(workWeekend.start_date), 'MMM d')} - {format(new Date(workWeekend.end_date), 'MMM d, yyyy')}
                    </div>
                  </div>

                  {workWeekend.description && (
                    <p className="text-sm">{workWeekend.description}</p>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      This work weekend overlaps with your group's reservation time. 
                      Your approval is needed to proceed.
                    </p>
                  </div>

                  <Button 
                    onClick={() => handleGroupLeadApproval(approval.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Approving...' : 'Approve Work Weekend'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All Work Weekends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Work Weekends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workWeekends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No work weekends proposed yet
            </p>
          ) : (
            workWeekends.map((workWeekend: any) => (
              <div key={workWeekend.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{workWeekend.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Proposed by: {workWeekend.proposer_name} ({workWeekend.proposer_family_group || 'No group'})
                    </p>
                  </div>
                  {getStatusBadge(workWeekend.status)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(workWeekend.start_date), 'MMM d')} - {format(new Date(workWeekend.end_date), 'MMM d, yyyy')}
                  </div>
                  {workWeekend.conflict_reservations?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      {workWeekend.conflict_reservations.length} conflict(s)
                    </div>
                  )}
                </div>

                {workWeekend.description && (
                  <p className="text-sm">{workWeekend.description}</p>
                )}

                {workWeekend.status === 'fully_approved' && workWeekend.fully_approved_at && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">
                      ✅ Fully approved on {format(new Date(workWeekend.fully_approved_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};