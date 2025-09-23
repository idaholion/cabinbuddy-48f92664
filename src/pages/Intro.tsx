import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DefaultFeatureShowcase } from "@/components/DefaultFeatureShowcase";

const Intro = () => {
  console.log('🚀 Intro component loaded - JavaScript is working');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showFeatures, setShowFeatures] = useState(false);

  // Debug logging
  console.log('🏠 Intro page loading:', {
    user: user ? { id: user.id, email: user.email } : null,
    location: location.pathname,
    search: location.search
  });

  // Check if we're in debug mode
  const isDebugMode = location.search.includes('debug=true');

  // Redirect authenticated users to their dashboard (unless in debug mode or they're trying to access a specific page)
  useEffect(() => {
    console.log('🏠 Intro useEffect - checking redirect:', {
      hasUser: !!user,
      isDebugMode,
      pathname: location.pathname,
      search: location.search
    });
    
    // Don't redirect if user is trying to access a specific page (indicated by search params or hash)
    const hasSpecificDestination = location.search || location.hash;
    
    if (user && !isDebugMode && !hasSpecificDestination && location.pathname === '/') {
      console.log('🔄 Intro - attempting redirect to /home');
      navigate("/home", { replace: true });
    }
  }, [user, navigate, isDebugMode, location]);


  const handleGetStarted = () => {
    navigate("/demo");
  };


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-screen">
        {/* Background image container */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 bg-center bg-cover bg-no-repeat hero-background"
          style={{
            backgroundImage: 'url(/lovable-uploads/d6d60442-2bb7-47fd-8782-98611fc53830.png)',
            backgroundPosition: 'center top'
          }}
        >
        </div>


        {/* Action Buttons */}
        <div className="absolute z-20 bottom-8 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button 
              onClick={() => navigate("/signup")}
              size="lg" 
              variant="outline"
              className="bg-white text-black border-white hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            >
              Start a New Organization
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              size="lg" 
              variant="outline"
              className="bg-white text-black border-white hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            >
              Sign In
            </Button>
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
            >
              Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          {/* Features CTA */}
          <Button 
            onClick={() => setShowFeatures(!showFeatures)}
            variant="outline"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 backdrop-blur-sm px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {showFeatures ? 'Hide Features' : '✨ Explore Features'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Features Overlay */}
      {showFeatures && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl max-w-6xl max-h-[90vh] w-full overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  CabinBuddy Features
                </h2>
                <p className="text-muted-foreground">
                  Everything you need to manage your family cabin
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeatures(false)}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <DefaultFeatureShowcase />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Intro;