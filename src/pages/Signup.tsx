import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiOrganization } from "@/hooks/useMultiOrganization";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [organizationType, setOrganizationType] = useState("");
  const [organizationCode, setOrganizationCode] = useState("");
  const [error, setError] = useState("");
  const { signUp, user } = useAuth();
  const { joinOrganization, createOrganization } = useMultiOrganization();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if user came from login failure
  useEffect(() => {
    if (searchParams.get('from') === 'login') {
      // Optional: show a message about coming from login
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate organization selection
    if (!organizationType) {
      setError("Please select whether you want to start or join an organization.");
      setLoading(false);
      return;
    }

    if (organizationType === "join" && !organizationCode) {
      setError("Please enter an organization code to join.");
      setLoading(false);
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`.trim(),
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      toast({
        title: "Account created successfully!",
        description: "Please check your email to confirm your account. You can continue with organization setup now.",
      });

      // Handle organization operations after successful signup
      if (organizationType === "join") {
        try {
          await joinOrganization(organizationCode);
          console.log('🚀 [SIGNUP] Successfully joined organization, navigating to manage-organizations');
          toast({
            title: "Successfully joined organization!",
            description: "Welcome to your new cabin sharing group.",
          });
          // Navigate to manage organizations with context to continue to family-group-setup
          navigate("/manage-organizations", { 
            state: { from: { pathname: '/family-group-setup' } }
          });
        } catch (joinError: any) {
          // If join fails, redirect to select org page with error context
          toast({
            title: "Organization join failed",
            description: joinError.message || "Invalid organization code. Please try again.",
            variant: "destructive"
          });
          navigate("/manage-organizations", { 
            state: { from: { pathname: '/family-group-setup' } }
          });
        }
      } else if (organizationType === "start") {
        // Store signup data and redirect to organization setup
        localStorage.setItem('signupData', JSON.stringify({
          firstName,
          lastName,
          email,
          timestamp: Date.now()
        }));
        navigate("/setup");
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred. Please try again.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <Card className="w-full max-w-md bg-white/60 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-kaushan text-red-500">Join Cabin Buddy</CardTitle>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          {searchParams.get('from') === 'login' && (
            <div className="mb-4 p-3 text-sm bg-blue-50 border border-blue-200 rounded-md text-blue-800">
              We don't see your email in our system. Create a new account below.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 text-sm bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-4 mb-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">What would you like to do?</Label>
              <RadioGroup value={organizationType} onValueChange={setOrganizationType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="start" id="start-org" />
                  <Label htmlFor="start-org">Start a new organization</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="join" id="join-org" />
                  <Label htmlFor="join-org">Join an existing organization</Label>
                </div>
              </RadioGroup>
            </div>
            
            {organizationType === "join" && (
              <div className="space-y-2">
                <Label htmlFor="orgCode">Organization Code</Label>
                <Input
                  id="orgCode"
                  type="text"
                  placeholder="Enter 6-letter code"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
              </div>
            )}
          </div>
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={password && confirmPassword && password !== confirmPassword ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !organizationType}>
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;