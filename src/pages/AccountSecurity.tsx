import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Lock, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

const AccountSecurity = () => {
  const { toast } = useToast();
  const { user, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found for your account.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await resetPassword(user.email);
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send password reset email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Reset Email Sent",
          description: `A password reset link has been sent to ${user.email}. Please check your email and follow the instructions.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-primary" />
          Account Security
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your account security settings and password.
        </p>
      </div>

      {/* Account Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <p className="text-base font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Created</label>
              <p className="text-base">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground text-base">
              Change your password by requesting a secure reset link.
            </p>
            <ConfirmationDialog
              title="Reset Password"
              description={`A password reset email will be sent to ${user?.email}. You will need to check your email and follow the instructions to create a new password.`}
              confirmText="Send Reset Email"
              onConfirm={handlePasswordReset}
            >
              <Button variant="outline" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Change Password
              </Button>
            </ConfirmationDialog>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-base text-muted-foreground">
          <p>• Use a strong, unique password for your account</p>
          <p>• Never share your password with others</p>
          <p>• Check your email regularly for security notifications</p>
          <p>• Log out of shared devices after use</p>
          <p>• Contact support if you notice any suspicious activity</p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center">
        <Button onClick={() => navigate('/home')} size="lg" className="flex items-center space-x-2 text-base">
          <Home className="h-4 w-4" />
          <span>Return to Home</span>
        </Button>
      </div>
    </div>
  );
};

export default AccountSecurity;