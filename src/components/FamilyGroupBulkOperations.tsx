import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useFamilyGroupBulkOperations } from "@/hooks/useFamilyGroupBulkOperations";
import { useBulkOperationProtection } from "@/hooks/useBulkOperationProtection";
import { SupervisorBulkOperationDialog } from "@/components/SupervisorBulkOperationDialog";
import { Users, Phone, Mail, UserMinus, Shield, ShieldOff } from "lucide-react";

export const FamilyGroupBulkOperations = () => {
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [hostNameToRemove, setHostNameToRemove] = useState("");
  
  const { bulkUpdateLeads, bulkRemoveHostMember, bulkUpdateReservationPermissions } = useFamilyGroupBulkOperations();
  const { 
    isDialogOpen, 
    currentOperation, 
    loading, 
    executeBulkOperation, 
    cancelOperation,
    isSupervisor 
  } = useBulkOperationProtection();

  if (!isSupervisor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
          <CardDescription>
            Bulk operations require supervisor privileges.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Group Bulk Operations
          </CardTitle>
          <CardDescription>
            Perform operations across multiple family groups at once. These actions affect all groups in the organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Update Lead Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <h3 className="text-lg font-medium">Update Lead Contact Information</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Update phone or email for all family group leads in this organization.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadPhone">New Lead Phone (optional)</Label>
                <Input
                  id="leadPhone"
                  placeholder="Enter new phone number"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadEmail">New Lead Email (optional)</Label>
                <Input
                  id="leadEmail"
                  placeholder="Enter new email address"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => bulkUpdateLeads(leadPhone || undefined, leadEmail || undefined)}
              disabled={!leadPhone && !leadEmail}
              className="w-full"
            >
              <Phone className="h-4 w-4 mr-2" />
              Update All Lead Information
            </Button>
          </div>

          <Separator />

          {/* Remove Host Member */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserMinus className="h-4 w-4" />
              <h3 className="text-lg font-medium">Remove Host Member</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Remove a specific host member from all family groups where they exist.
            </p>
            <div className="space-y-2">
              <Label htmlFor="hostName">Host Member Name</Label>
              <Input
                id="hostName"
                placeholder="Enter exact host member name"
                value={hostNameToRemove}
                onChange={(e) => setHostNameToRemove(e.target.value)}
              />
            </div>
            <Button
              onClick={() => bulkRemoveHostMember(hostNameToRemove)}
              disabled={!hostNameToRemove.trim()}
              variant="destructive"
              className="w-full"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remove Host Member from All Groups
            </Button>
          </div>

          <Separator />

          {/* Reservation Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <h3 className="text-lg font-medium">Reservation Permissions</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable or disable reservation permissions for all host members across all family groups.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => bulkUpdateReservationPermissions(true)}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable All Host Reservations
              </Button>
              <Button
                onClick={() => bulkUpdateReservationPermissions(false)}
                variant="outline"
                className="w-full"
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable All Host Reservations
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SupervisorBulkOperationDialog
        open={isDialogOpen}
        onOpenChange={cancelOperation}
        operationType={currentOperation?.operationType || ""}
        affectedRecords={currentOperation?.estimatedRecords || 0}
        organizationName={currentOperation?.organizationName || ""}
        onConfirm={executeBulkOperation}
        loading={loading}
      />
    </>
  );
};