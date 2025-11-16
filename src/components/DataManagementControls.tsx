import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Database, AlertTriangle, Loader2, CheckCircle, XCircle, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserManagement } from "./UserManagement";
import { BackfillSplitOccupancy } from "./BackfillSplitOccupancy";

interface Organization {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface DataManagementControlsProps {
  organizations: Organization[];
  onDataChanged: () => void;
}

export const DataManagementControls = ({ organizations, onDataChanged }: DataManagementControlsProps) => {
  const { toast } = useToast();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastOperation, setLastOperation] = useState<{ type: string; success: boolean; message: string } | null>(null);

  // Get selected organization details
  const selectedOrg = organizations.find(org => org.id === selectedOrgId);
  const expectedDeleteConfirmation = selectedOrg ? `DELETE_ORG_${selectedOrg.name.toUpperCase().replace(/\s+/g, '_')}` : "";

  const handleResetAllData = async () => {
    if (confirmationInput !== "RESET_ALL_DATA") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type 'RESET_ALL_DATA' exactly to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Debug: Check current session and user
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('User ID:', session?.user?.id);
      console.log('User email:', session?.user?.email);
      
      // Test supervisor function first
      const { data: supervisorTest, error: supervisorError } = await supabase.rpc('is_supervisor');
      console.log('Supervisor test result:', supervisorTest);
      console.log('Supervisor test error:', supervisorError);
      
      if (!supervisorTest) {
        toast({
          title: "Authentication Error",
          description: "Unable to verify supervisor privileges. Please try logging out and back in.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('supervisor_reset_database', {
        p_confirmation_code: 'RESET_ALL_DATA'
      });

      if (error) {
        throw error;
      }

      setLastOperation({
        type: "reset",
        success: true,
        message: data || "Database reset completed successfully"
      });

      toast({
        title: "Success",
        description: "All organizational data has been cleared. Supervisor access maintained.",
      });

      onDataChanged();
      setIsResetDialogOpen(false);
      setConfirmationInput("");
    } catch (error: any) {
      console.error("Error resetting database:", error);
      setLastOperation({
        type: "reset",
        success: false,
        message: error.message || "Failed to reset database"
      });

      toast({
        title: "Error",
        description: error.message || "Failed to reset database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrg || confirmationInput !== expectedDeleteConfirmation) {
      toast({
        title: "Invalid Confirmation",
        description: `Please type '${expectedDeleteConfirmation}' exactly to confirm.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('supervisor_delete_organization', {
        p_organization_id: selectedOrgId,
        p_confirmation_code: expectedDeleteConfirmation
      });

      if (error) {
        throw error;
      }

      setLastOperation({
        type: "delete",
        success: true,
        message: data || `Organization "${selectedOrg.name}" deleted successfully`
      });

      toast({
        title: "Success",
        description: `Organization "${selectedOrg.name}" and all its data has been deleted.`,
      });

      onDataChanged();
      setIsDeleteDialogOpen(false);
      setSelectedOrgId("");
      setConfirmationInput("");
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      setLastOperation({
        type: "delete",
        success: false,
        message: error.message || "Failed to delete organization"
      });

      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Database className="h-5 w-5" />
            Data Management Controls
          </CardTitle>
          <CardDescription className="text-base">
            Dangerous operations for managing organizational data. Use with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Last Operation Status */}
          {lastOperation && (
            <div className={`p-4 rounded-lg border ${
              lastOperation.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {lastOperation.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  Last {lastOperation.type} operation: {lastOperation.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <p className="text-sm mt-1">{lastOperation.message}</p>
            </div>
          )}

          {/* Organization List */}
          <div>
            <h4 className="font-medium mb-3">Current Organizations ({organizations.length})</h4>
            <div className="grid gap-3">
              {organizations.length === 0 ? (
                <p className="text-muted-foreground text-base">No organizations found</p>
              ) : (
                organizations.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-base">{org.name}</div>
                      <div className="text-base text-muted-foreground">Code: {org.code}</div>
                    </div>
                    <div className="text-base text-muted-foreground">
                      Created: {new Date(org.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reset All Data */}
          <div className="space-y-3">
            <h4 className="font-medium text-destructive">Reset All Data</h4>
            <p className="text-base text-muted-foreground">
              Completely clears all organizational data while preserving supervisor accounts. 
              This gives you a clean slate for testing.
            </p>
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full hover:scale-105 hover:shadow-lg hover:shadow-destructive/30 transition-all duration-200">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Reset All Organizational Data
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>This will permanently delete ALL organizational data including:</p>
                    <ul className="list-disc list-inside text-base space-y-1">
                      <li>All organizations and their settings</li>
                      <li>All family groups and members</li>
                      <li>All reservations and calendar data</li>
                      <li>All financial records and receipts</li>
                      <li>All user profiles and associations</li>
                    </ul>
                    <p className="font-medium">Supervisor accounts will be preserved.</p>
                    <div className="space-y-2">
                      <Label htmlFor="reset-confirmation" className="text-base">
                        Type "RESET_ALL_DATA" to confirm:
                      </Label>
                      <Input
                        id="reset-confirmation"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder="RESET_ALL_DATA"
                        disabled={isLoading}
                        className="text-base placeholder:text-base"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading} className="text-base">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAllData}
                    disabled={isLoading || confirmationInput !== "RESET_ALL_DATA"}
                    className="bg-destructive hover:bg-destructive/90 text-base"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset All Data"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Individual Organization */}
          <div className="space-y-3">
            <h4 className="font-medium text-destructive">Delete Individual Organization</h4>
            <p className="text-base text-muted-foreground">
              Delete a specific organization and all its associated data without affecting other organizations.
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="org-select" className="text-base">Select Organization to Delete:</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Choose an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id} className="text-base">
                        {org.name} ({org.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full text-base"
                  disabled={!selectedOrgId || organizations.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected Organization
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Organization "{selectedOrg?.name}"
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>This will permanently delete the organization "{selectedOrg?.name}" and ALL its data including:</p>
                      <ul className="list-disc list-inside text-base space-y-1">
                        <li>Family groups and members</li>
                        <li>Reservations and calendar entries</li>
                        <li>Financial records and receipts</li>
                        <li>User associations with this organization</li>
                        <li>All other organization-specific data</li>
                      </ul>
                      <p className="font-medium text-destructive">This action cannot be undone.</p>
                      {selectedOrg && (
                        <div className="space-y-2">
                          <Label htmlFor="delete-confirmation" className="text-base">
                            Type "{expectedDeleteConfirmation}" to confirm:
                          </Label>
                          <Input
                            id="delete-confirmation"
                            value={confirmationInput}
                            onChange={(e) => setConfirmationInput(e.target.value)}
                            placeholder={expectedDeleteConfirmation}
                            disabled={isLoading}
                            className="text-base placeholder:text-base"
                          />
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading} className="text-base">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrganization}
                      disabled={isLoading || confirmationInput !== expectedDeleteConfirmation}
                      className="bg-destructive hover:bg-destructive/90 text-base"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Organization"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* User Management */}
          <div className="space-y-3">
            <UserManagement />
          </div>

          {/* Split Occupancy Backfill */}
          <div className="space-y-3">
            <BackfillSplitOccupancy />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};