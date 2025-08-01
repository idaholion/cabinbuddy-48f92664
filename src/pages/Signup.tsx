import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [organizationType, setOrganizationType] = useState("");
  const [organizationCode, setOrganizationCode] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`.trim(),
    });

    if (!error) {
      toast({
        title: "Account created successfully!",
        description: "Please check your email to confirm your account before signing in.",
      });
      
      // Store signup data for organization creation if starting new org
      if (organizationType === "start") {
        localStorage.setItem('signupData', JSON.stringify({
          firstName,
          lastName,
          email,
          timestamp: Date.now()
        }));
      }
      
      // Redirect based on organization selection
      if (organizationType === "join") {
        navigate("/select-family-group");
      } else if (organizationType === "start") {
        navigate("/setup");
      } else {
        navigate("/login");
      }
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
            <Button type="submit" className="w-full" disabled={loading}>
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