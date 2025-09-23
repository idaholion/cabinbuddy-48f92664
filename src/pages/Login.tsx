import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSetupState } from "@/hooks/useSetupState";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [error, setError] = useState("");
  const { signIn, resetPassword, user } = useAuth();
  const { getSetupRedirectPath } = useSetupState();
  const navigate = useNavigate();

  // Only redirect if not in debug mode (check for debug query param or debug mode indicator)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.has('debug') || window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development';
    
    if (user && !isDebugMode) {
      const setupPath = getSetupRedirectPath();
      navigate(setupPath || "/home");
    }
  }, [user, navigate, getSetupRedirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log('Attempting login...');
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Login error:', error);
      // Provide specific error messages
      if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (error.message.includes('Email not confirmed')) {
        setError("Please check your email and confirm your account before signing in.");
      } else if (error.message.includes('signups not allowed')) {
        setError("Account creation is currently disabled. Please contact support.");
      } else {
        setError(error.message || "Unable to sign in. Please try again.");
      }
    } else {
      console.log('Login successful');
      // Use a slight delay to allow setup state to be determined after login
      setTimeout(() => {
        const setupPath = getSetupRedirectPath();
        navigate(setupPath || "/home");
      }, 100);
    }
    
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    setResetMode(false);
  };


  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <Card className="w-full max-w-xs bg-white/60 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-kaushan text-red-500">
            {resetMode ? "Reset Password" : "Login to Cabin Buddy"}
          </CardTitle>
          <CardDescription>
            {resetMode ? "Enter your email to reset your password" : "Welcome back! Please sign in to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !resetMode && (
            <div className="mb-4 p-3 text-sm bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
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
            {!resetMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
            )}
            
            {resetMode ? (
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setResetMode(false)}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <>
                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="h-4 w-4 mr-2" />
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
                <div className="text-center">
                  <button 
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setResetMode(true)}
                  >
                    Forgot your password?
                  </button>
                </div>
              </>
            )}
            
            {!resetMode && (
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Start a New Organization
                </Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;