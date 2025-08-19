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
  const [isUserGuideDialogOpen, setIsUserGuideDialogOpen] = useState(false);

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

          {/* User Account Management */}
          <div className="space-y-3">
            <h4 className="font-medium text-destructive">User Account Management</h4>
            <p className="text-base text-muted-foreground">
              Instructions for deleting user authentication accounts from Supabase Dashboard.
            </p>
            <AlertDialog open={isUserGuideDialogOpen} onOpenChange={setIsUserGuideDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground hover:scale-105 hover:shadow-lg hover:shadow-destructive/30 transition-all duration-200">
                  <Users className="h-4 w-4 mr-2" />
                  How to Delete Users
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    How to Delete User Authentication Accounts
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4 text-left">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="font-medium text-yellow-800">Important Note:</p>
                      <p className="text-sm text-yellow-700">
                        When you reset application data, user authentication accounts remain in Supabase Auth. 
                        This is normal behavior - authentication and application data are separate systems.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h5 className="font-medium">Step-by-Step Instructions:</h5>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          <strong>Access Supabase Dashboard:</strong>
                          <br />
                          Open your browser and go to{" "}
                          <code className="bg-gray-100 px-1 rounded">supabase.com</code> and sign in to your account.
                        </li>
                        <li>
                          <strong>Navigate to your project:</strong>
                          <br />
                          Select the project that contains your application data.
                        </li>
                        <li>
                          <strong>Go to Authentication section:</strong>
                          <br />
                          In the left sidebar, click on{" "}
                          <code className="bg-gray-100 px-1 rounded">Authentication</code>.
                        </li>
                        <li>
                          <strong>Access Users tab:</strong>
                          <br />
                          Click on the{" "}
                          <code className="bg-gray-100 px-1 rounded">Users</code> tab to see all authenticated users.
                        </li>
                        <li>
                          <strong>Find users to delete:</strong>
                          <br />
                          Look for test users such as{" "}
                          <code className="bg-gray-100 px-1 rounded">test1@test1.com</code>,{" "}
                          <code className="bg-gray-100 px-1 rounded">rvandrew@outlook.com</code>, or other test accounts.
                        </li>
                        <li>
                          <strong>Delete users:</strong>
                          <br />
                          Click the three dots menu (⋯) next to each user you want to delete, then select{" "}
                          <code className="bg-gray-100 px-1 rounded">Delete user</code>.
                        </li>
                        <li>
                          <strong>Confirm deletion:</strong>
                          <br />
                          Confirm the deletion when prompted. The user will be permanently removed from authentication.
                        </li>
                      </ol>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-blue-800">Pro Tip:</p>
                      <p className="text-sm text-blue-700">
                        After deleting users, you can create fresh test accounts or use different email addresses 
                        for testing without conflicts.
                      </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-medium text-red-800">Caution:</p>
                      <p className="text-sm text-red-700">
                        Only delete test/development user accounts. Do not delete production user accounts 
                        unless you are certain they should be removed permanently.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-base">Close</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};