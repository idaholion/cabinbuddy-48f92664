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
import { useAccessCodes } from "@/hooks/useAccessCodes";
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
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const { signUp, user } = useAuth();
  const { joinOrganization, createOrganization } = useMultiOrganization();
  const { validateAccessCode, consumeAccessCode } = useAccessCodes();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get mode and code from URL parameters
  const mode = searchParams.get('mode'); // 'start' or 'join'
  const codeFromUrl = searchParams.get('code')?.toUpperCase() || "";

  // Function to determine user role and navigate accordingly
  const determineUserRoleAndNavigate = async (userEmail: string) => {
    try {
      console.log('🔍 [SIGNUP] Determining user role for navigation...');
      
      // Fetch family groups to determine user role
      const { data: familyGroups, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('organization_id', organizationCode === 'GLOBAL' ? 
          '123e4567-e89b-12d3-a456-426614174000' : 
          organizationCode);

      if (error) {
        console.error('❌ [SIGNUP] Error fetching family groups:', error);
        // Fallback to family-group-setup on error
        toast({
          title: "Welcome!",
          description: "Successfully joined organization. Redirecting to setup...",
        });
        setTimeout(() => navigate("/family-group-setup"), 1500);
        return;
      }

      console.log('📋 [SIGNUP] Family groups found:', familyGroups?.length || 0);

      if (!familyGroups || familyGroups.length === 0) {
        // No family groups yet, user likely needs to set up
        toast({
          title: "Welcome!",
          description: "Successfully joined organization. Redirecting to family group setup...",
        });
        setTimeout(() => navigate("/family-group-setup"), 1500);
        return;
      }

      // Only group leads should go to setup page
      const userGroup = familyGroups.find(group => 
        group.lead_email && group.lead_email.toLowerCase() === userEmail.toLowerCase()
      );

      const shouldGoToSetup = !!userGroup;

      console.log('🎯 [SIGNUP] Role determination result:', {
        userEmail,
        shouldGoToSetup,
        destination: shouldGoToSetup ? "/family-group-setup" : "/group-member-profile"
      });

      if (shouldGoToSetup) {
        toast({
          title: "Welcome!",
          description: "Successfully joined organization. Redirecting to family group setup...",
        });
        setTimeout(() => navigate("/family-group-setup"), 1500);
      } else {
        toast({
          title: "Welcome!",
          description: "Successfully joined organization. Redirecting to your profile...",
        });
        setTimeout(() => navigate("/group-member-profile"), 1500);
      }

    } catch (error) {
      console.error('❌ [SIGNUP] Error in role determination:', error);
      // Fallback to family-group-setup on error
      toast({
        title: "Welcome!",
        description: "Successfully joined organization. Redirecting to setup...",
      });
      setTimeout(() => navigate("/family-group-setup"), 1500);
    }
  };

  // Check if user came from login failure and set organization type based on mode
  useEffect(() => {
    if (searchParams.get('from') === 'login') {
      // Optional: show a message about coming from login
    }
    
    // Set organizationType based on mode parameter
    if (mode === 'start') {
      setOrganizationType('start');
    } else if (mode === 'join') {
      setOrganizationType('join');
    }
    
    // Pre-fill organization code if provided via URL (from invite link)
    if (codeFromUrl && mode === 'join') {
      setOrganizationCode(codeFromUrl);
    }
  }, [searchParams, mode, codeFromUrl]);

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

    if (organizationType === "start" && !accessCode) {
      setError("Please enter an access code to start a new organization.");
      setLoading(false);
      return;
    }

    // Validate access code if starting new organization
    if (organizationType === "start") {
      const isValidCode = await validateAccessCode(accessCode);
      if (!isValidCode) {
        setError("Invalid or expired access code. Please check your code and try again.");
        setLoading(false);
        return;
      }
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
        description: "You're now signed in and ready to continue with organization setup.",
      });

      // Handle organization operations after successful signup
      if (organizationType === "join") {
        console.log('🔍 [SIGNUP] Starting organization join process...');
        
        // Set signup flag to prevent security monitoring errors
        localStorage.setItem('recent-signup', Date.now().toString());
        
        // Wait for authentication to complete and retry joining
        const joinWithRetry = async (retries = 10) => {
          for (let i = 0; i < retries; i++) {
            console.log(`🔍 [SIGNUP] Join attempt ${i + 1}/${retries}`);
            
            // Check if user is authenticated with longer timeout
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (currentUser) {
              console.log('✅ [SIGNUP] User authenticated, attempting direct join...');
              
              // Instead of using the hook, make the join request directly to avoid timing issues
              try {
                // First, find the organization by code
                const { data: org, error: orgError } = await supabase
                  .from('organizations')
                  .select('id, name, code')
                  .eq('code', organizationCode.toUpperCase())
                  .single();

                if (orgError || !org) {
                  console.error('❌ [SIGNUP] Organization not found:', orgError);
                  toast({
                    title: "Error",
                    description: "Organization not found with that code.",
                    variant: "destructive",
                  });
                  break;
                }

                console.log('✅ [SIGNUP] Found organization:', org.name);

                // Add user to organization directly
                const { error: joinError } = await supabase
                  .from('user_organizations')
                  .insert({
                    user_id: currentUser.id,
                    organization_id: org.id,
                    role: 'member',
                    is_primary: true // Make it primary since it's their first org
                  });

                if (joinError) {
                  console.error('❌ [SIGNUP] Database error during join:', joinError);
                  // If it's a duplicate error, that's actually OK - they're already in the org
                  if (joinError.code === '23505') { // Unique constraint violation
                    console.log('✅ [SIGNUP] User already in organization, proceeding...');
                  } else {
                    toast({
                      title: "Error",
                      description: "Failed to join organization. Please try again.",
                      variant: "destructive",
                    });
                    break;
                  }
                }

                console.log('✅ [SIGNUP] Successfully joined organization');
                
                // Clear signup flag since join was successful
                localStorage.removeItem('recent-signup');
                
                // Determine user role and navigate accordingly
                await determineUserRoleAndNavigate(email);
                return;
                
              } catch (joinError: any) {
                console.error('❌ [SIGNUP] Exception during direct join:', joinError);
                // If it's the last retry, show error, otherwise continue retrying
                if (i === retries - 1) {
                  toast({
                    title: "Error",
                    description: "Failed to join organization. Please try again from the setup page.",
                    variant: "destructive",
                  });
                  break;
                }
              }
            } else {
              console.log(`⏳ [SIGNUP] User not yet authenticated, waiting... (${i + 1}/${retries})`);
              // Wait 2 seconds before retrying for better reliability
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          // If we get here, joining failed
          console.error('❌ [SIGNUP] Failed to join organization after retries');
          // Clear signup flag since we're giving up
          localStorage.removeItem('recent-signup');
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
          trialCode: accessCode.trim().toUpperCase(),
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
          <CardTitle className="text-3xl font-kaushan text-red-500">
            {mode === 'start' ? 'Start New Organization' : mode === 'join' ? 'Join Organization' : 'Join Cabin Buddy'}
          </CardTitle>
          <CardDescription>
            {mode === 'start' ? 'Enter your trial code and create your account' : mode === 'join' ? 'Enter organization code and create your account' : 'Create your account to get started'}
          </CardDescription>
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
          {/* Only show the mode-specific field, no radio buttons */}
          <div className="space-y-4 mb-6">
            {mode === 'join' && (
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
                  required
                />
              </div>
            )}

            {mode === 'start' && (
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="uppercase"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  You need an access code to start a new organization
                </p>
              </div>
            )}

            {!mode && (
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
            )}
            
            {!mode && organizationType === "join" && (
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

            {!mode && organizationType === "start" && (
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="uppercase"
                />
                <p className="text-sm text-muted-foreground">
                  You need an access code to start a new organization
                </p>
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