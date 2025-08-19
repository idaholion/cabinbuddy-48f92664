import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Star, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FeatureShowcase } from "@/components/FeatureShowcase";

const Intro = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFeatures, setShowFeatures] = useState(false);

  // Check if we're in debug mode
  const isDebugMode = location.search.includes('debug=true');

  // Redirect authenticated users to their dashboard (unless in debug mode)
  useEffect(() => {
    if (user && !isDebugMode) {
      navigate("/home", { replace: true });
    }
  }, [user, navigate, isDebugMode]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("🎯 handleImageUpload called, prevented defaults");
    const file = event.target.files?.[0];
    if (file) {
      console.log("📄 File selected:", file.name, file.size);
      
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5MB");
        return;
      }
      
      console.log("🔄 Creating blob URL...");
      const blobUrl = URL.createObjectURL(file);
      console.log("🎯 Created blob URL:", blobUrl);
      
      console.log("🔍 Looking for background element...");
      const bgElement = document.querySelector('[data-background="true"]') as HTMLElement;
      console.log("🔍 Background element found:", !!bgElement);
      
      if (bgElement) {
        console.log("🖼️ Setting background image:", blobUrl);
        bgElement.style.setProperty('background-image', `url("${blobUrl}")`);
        console.log("✅ Background image set (size/position handled by CSS)");
        console.log("🔍 Current backgroundImage value:", bgElement.style.backgroundImage);
      } else {
        console.error("❌ Background element not found");
      }
    } else {
      console.log("❌ No file selected");
    }
    console.log("🧹 Clearing input value");
    event.target.value = '';
    console.log("✅ handleImageUpload complete");
  };

  const handleGetStarted = () => {
    navigate("/demo");
  };

  const handleFeatureClick = (featureId: string) => {
    console.log(`Feature clicked: ${featureId}`);
    // Could navigate to specific demo sections or help pages
  };

  const triggerFileInput = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log("🎯 Triggering file input click, prevented defaults");
    const input = fileInputRef.current;
    if (input) {
      console.log("✅ File input found, clicking...");
      
      // Add event listener to detect when dialog opens
      const handleFocus = () => {
        console.log("🔍 File dialog opened (focus event)");
        input.removeEventListener('focus', handleFocus);
      };
      
      input.addEventListener('focus', handleFocus);
      input.click();
      
      // Also check if the input has any change listeners
      console.log("🔍 Input has change event listener:", !!input.onchange);
    } else {
      console.error("❌ File input ref is null");
    }
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

        {/* Hidden file input for image upload functionality */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          aria-hidden="true"
        />

        {/* Action Buttons */}
        <div className="absolute z-20 bottom-8 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button 
              onClick={() => navigate("/signup")}
              size="lg" 
              variant="outline"
              className="bg-white text-black border-white hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            >
              Sign Up
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
            variant="ghost"
            className="text-white hover:text-white/80 hover:bg-white/10 backdrop-blur-sm"
          >
            {showFeatures ? 'Hide Features' : 'Explore Features'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Features Section */}
      {showFeatures && (
        <div className="bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need to Manage Your Family Cabin
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                CabinBuddy provides comprehensive tools for scheduling, financial management, 
                communication, and documentation to make your shared cabin experience seamless.
              </p>
            </div>

            {/* Value Propositions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Fair & Organized</h3>
                <p className="text-muted-foreground">
                  Transparent scheduling and cost sharing ensures everyone gets their fair share.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
                <p className="text-muted-foreground">
                  Intuitive interface designed specifically for family cabin management.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Complete Solution</h3>
                <p className="text-muted-foreground">
                  From booking to billing, photos to maintenance - all in one place.
                </p>
              </div>
            </div>

            {/* Feature Showcase */}
            <FeatureShowcase variant="public" onFeatureClick={handleFeatureClick} />

            {/* CTA Section */}
            <div className="text-center mt-16 p-8 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join families already using CabinBuddy to manage their shared properties with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="px-8 py-3"
                >
                  Try Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => navigate("/signup")}
                  size="lg" 
                  variant="outline"
                  className="px-8 py-3"
                >
                  Sign Up Today
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Intro;