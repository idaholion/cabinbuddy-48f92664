import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('Attempting login...');
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Login error:', error);
    } else {
      console.log('Login successful');
      navigate("/home");
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
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await signIn('', '');
                    if (error) {
                      console.error('Anonymous login error:', error);
                    } else {
                      navigate("/home");
                    }
                    setLoading(false);
                  }}
                >
                  Continue as Guest (Temporary)
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
                  Sign up
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