import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VerifyPhoneReset = () => {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [userId, setUserId] = useState<string>("");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-reset', {
        body: { phone, code }
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message || "Invalid or expired verification code.",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        setUserId(data.userId);
        setStep("reset");
        toast({
          title: "Code Verified",
          description: "Please enter your new password.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid or expired verification code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-phone-reset', {
        body: { userId, newPassword }
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message || "Failed to reset password.",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated. You can now sign in.",
        });
        navigate("/login");
      } else {
        toast({
          title: "Reset Failed",
          description: data.error || "Failed to reset password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <Card className="w-full max-w-md bg-white/60 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-kaushan text-red-500 flex items-center justify-center gap-2">
            <Phone className="h-8 w-8" />
            Phone Reset
          </CardTitle>
          <CardDescription>
            {step === "verify" 
              ? `Enter the 6-digit code sent to ${phone}`
              : "Enter your new password"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "verify" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
          
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyPhoneReset;