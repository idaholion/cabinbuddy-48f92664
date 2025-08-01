import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Database, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
          <CardDescription>
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
                <p className="text-muted-foreground text-sm">No organizations found</p>
              ) : (
                organizations.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-muted-foreground">Code: {org.code}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">
              Completely clears all organizational data while preserving supervisor accounts. 
              This gives you a clean slate for testing.
            </p>
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
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
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>All organizations and their settings</li>
                      <li>All family groups and members</li>
                      <li>All reservations and calendar data</li>
                      <li>All financial records and receipts</li>
                      <li>All user profiles and associations</li>
                    </ul>
                    <p className="font-medium">Supervisor accounts will be preserved.</p>
                    <div className="space-y-2">
                      <Label htmlFor="reset-confirmation">
                        Type "RESET_ALL_DATA" to confirm:
                      </Label>
                      <Input
                        id="reset-confirmation"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder="RESET_ALL_DATA"
                        disabled={isLoading}
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAllData}
                    disabled={isLoading || confirmationInput !== "RESET_ALL_DATA"}
                    className="bg-destructive hover:bg-destructive/90"
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
            <p className="text-sm text-muted-foreground">
              Delete a specific organization and all its associated data without affecting other organizations.
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="org-select">Select Organization to Delete:</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
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
                    className="w-full"
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
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Family groups and members</li>
                        <li>Reservations and calendar entries</li>
                        <li>Financial records and receipts</li>
                        <li>User associations with this organization</li>
                        <li>All other organization-specific data</li>
                      </ul>
                      <p className="font-medium text-destructive">This action cannot be undone.</p>
                      {selectedOrg && (
                        <div className="space-y-2">
                          <Label htmlFor="delete-confirmation">
                            Type "{expectedDeleteConfirmation}" to confirm:
                          </Label>
                          <Input
                            id="delete-confirmation"
                            value={confirmationInput}
                            onChange={(e) => setConfirmationInput(e.target.value)}
                            placeholder={expectedDeleteConfirmation}
                            disabled={isLoading}
                          />
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrganization}
                      disabled={isLoading || confirmationInput !== expectedDeleteConfirmation}
                      className="bg-destructive hover:bg-destructive/90"
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
        </CardContent>
      </Card>
    </div>
  );
};