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
import { supabase } from "@/integrations/supabase/client";

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
      console.log('🔍 [SIGNUP] Starting signup process:', {
        organizationType,
        organizationCode,
        email,
        firstName,
        lastName
      });

      const { error: signUpError } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`.trim(),
      });

      if (signUpError) {
        console.error('❌ [SIGNUP] Auth signup error:', signUpError);
        setError(signUpError.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      console.log('✅ [SIGNUP] Account created successfully');
      toast({
        title: "Account created successfully!",
        description: "Please check your email to confirm your account. You can continue with organization setup now.",
      });

      // Handle organization operations after successful signup
      if (organizationType === "join") {
        // Wait for authentication to complete and retry joining
        const joinWithRetry = async (retries = 5) => {
          for (let i = 0; i < retries; i++) {
            console.log(`🔍 [SIGNUP] Join attempt ${i + 1}/${retries}`);
            
            // Check if user is authenticated
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (currentUser) {
              console.log('✅ [SIGNUP] User authenticated, attempting join...');
              try {
                const joinSuccess = await joinOrganization(organizationCode);
                
                if (joinSuccess) {
                  console.log('✅ [SIGNUP] Organization join successful');
                  toast({
                    title: "Welcome!",
                    description: "Successfully joined organization. Redirecting to family group setup...",
                  });
                  
                  // Direct redirect to family group setup
                  setTimeout(() => {
                    navigate("/family-group-setup");
                  }, 1500);
                  return;
                } else {
                  console.error('❌ [SIGNUP] Organization join failed');
                  break; // Don't retry if join explicitly failed
                }
              } catch (joinError: any) {
                console.error('❌ [SIGNUP] Exception during join:', joinError);
                break; // Don't retry on exceptions
              }
            } else {
              console.log(`⏳ [SIGNUP] User not yet authenticated, waiting... (${i + 1}/${retries})`);
              // Wait 1 second before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          // If we get here, joining failed
          console.error('❌ [SIGNUP] Failed to join organization after retries');
          toast({
            title: "Setup Required",
            description: "Account created! Please enter your organization code to complete setup.",
          });
          navigate("/setup");
        };
        
        joinWithRetry();
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
      console.error('❌ [SIGNUP] Top-level signup error:', {
        error,
        message: error?.message,
        stack: error?.stack,
        organizationType,
        organizationCode
      });
      
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