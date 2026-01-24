import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowRight, Users, Loader2, AlertCircle } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Join = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get code from URL parameter
  const codeFromUrl = searchParams.get('code')?.toUpperCase() || "";
  
  const [organizationCode, setOrganizationCode] = useState(codeFromUrl);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookupComplete, setLookupComplete] = useState(false);

  // Look up organization name when code is provided via URL
  useEffect(() => {
    const lookupOrganization = async () => {
      if (!codeFromUrl || codeFromUrl.length < 4) {
        setLookupComplete(true);
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('code', codeFromUrl)
          .single();

        if (orgError || !org) {
          setError("This invitation link appears to be invalid or the organization no longer exists.");
          setOrganizationName(null);
        } else {
          setOrganizationName(org.name);
        }
      } catch (err) {
        console.error('Error looking up organization:', err);
        setError("Unable to verify the invitation. Please check your connection and try again.");
      } finally {
        setLoading(false);
        setLookupComplete(true);
      }
    };

    lookupOrganization();
  }, [codeFromUrl]);

  // Handle manual code lookup
  const handleLookupCode = async () => {
    if (!organizationCode || organizationCode.length < 4) {
      setError("Please enter a valid organization code (at least 4 characters).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('code', organizationCode.toUpperCase())
        .single();

      if (orgError || !org) {
        setError("No organization found with that code. Please check the code and try again.");
        setOrganizationName(null);
      } else {
        setOrganizationName(org.name);
        setLookupComplete(true);
      }
    } catch (err) {
      console.error('Error looking up organization:', err);
      setError("Unable to verify the code. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Navigate to signup with code
  const handleCreateAccount = () => {
    navigate(`/signup?mode=join&code=${organizationCode.toUpperCase()}`);
  };

  // Navigate to login with code preserved
  const handleLogin = () => {
    navigate(`/login?code=${organizationCode.toUpperCase()}`);
  };

  // If user is already logged in and we have a valid code, redirect to manage organizations
  useEffect(() => {
    if (user && organizationName && lookupComplete) {
      // User is logged in and we have a valid organization - they can join from manage-organizations
      navigate(`/manage-organizations?code=${organizationCode.toUpperCase()}`);
    }
  }, [user, organizationName, lookupComplete, organizationCode, navigate]);

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4" 
      style={{ backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)' }}
    >
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Home className="h-8 w-8 text-primary" />
          </div>
          
          {loading ? (
            <>
              <CardTitle className="text-2xl font-kaushan text-primary">
                Looking up organization...
              </CardTitle>
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </>
          ) : organizationName ? (
            <>
              <CardTitle className="text-2xl font-kaushan text-primary">
                You've been invited to join
              </CardTitle>
              <div className="py-2">
                <p className="text-3xl font-bold text-foreground">{organizationName}</p>
              </div>
              <CardDescription className="text-base">
                Create an account or sign in to join this cabin organization
              </CardDescription>
            </>
          ) : codeFromUrl && error ? (
            <>
              <CardTitle className="text-2xl font-kaushan text-destructive">
                Invalid Invitation
              </CardTitle>
              <CardDescription className="text-destructive flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl font-kaushan text-primary">
                Join a Cabin Organization
              </CardTitle>
              <CardDescription>
                Enter the organization code shared by your group admin or family lead
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Show organization code input if no valid org found yet */}
          {!organizationName && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgCode" className="text-sm font-medium">
                  Organization Code
                </Label>
                <Input
                  id="orgCode"
                  type="text"
                  placeholder="Enter 6-letter code (e.g., CASTLE)"
                  value={organizationCode}
                  onChange={(e) => {
                    setOrganizationCode(e.target.value.toUpperCase());
                    setError("");
                    setOrganizationName(null);
                  }}
                  maxLength={8}
                  className="uppercase text-center text-lg tracking-widest font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupCode();
                    }
                  }}
                />
              </div>

              {error && !codeFromUrl && (
                <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleLookupCode}
                disabled={loading || !organizationCode}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Find Organization
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Show action buttons when organization is found */}
          {organizationName && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Organization Code</p>
                <p className="text-xl font-mono font-bold tracking-widest text-primary">
                  {organizationCode}
                </p>
              </div>

              <Button
                onClick={handleCreateAccount}
                className="w-full"
                size="lg"
              >
                Create Account & Join
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Already have an account?
                  </span>
                </div>
              </div>

              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Sign In
              </Button>

              {/* Reset to try different code */}
              <button
                onClick={() => {
                  setOrganizationName(null);
                  setOrganizationCode("");
                  setError("");
                  setLookupComplete(false);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different code
              </button>
            </div>
          )}

          {/* Back to home link */}
          <div className="pt-4 border-t text-center">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to Cabin Buddy Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Join;
