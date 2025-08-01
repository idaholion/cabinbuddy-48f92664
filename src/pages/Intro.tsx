
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Intro = () => {
  console.log("🔄 Intro component is mounting/re-mounting");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const backgroundImageRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug: Log whenever backgroundImage state changes
  useEffect(() => {
    console.log("🖼️ backgroundImage state changed:", backgroundImage ? "CUSTOM IMAGE SET" : "DEFAULT IMAGE");
    console.log("🔗 backgroundImageRef current:", backgroundImageRef.current ? "CUSTOM REF SET" : "DEFAULT REF");
  }, [backgroundImage]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed", event.target.files);
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, file.size);
      
      // Check file size limit (5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error("File too large:", file.size);
        alert("Please select an image smaller than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          console.log("FileReader loaded, result length:", result?.length);
          console.log("About to call setBackgroundImage and set ref...");
          
          // Set both state and ref
          backgroundImageRef.current = result;
          setBackgroundImage(result);
          
          console.log("Both state and ref set successfully");
          console.log("Ref value:", backgroundImageRef.current ? "SET" : "NOT SET");
        } catch (error) {
          console.error("Error in FileReader onload:", error);
        }
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("No file selected");
    }
  };

  const handleGetStarted = () => {
    navigate("/home");
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  console.log("Current backgroundImage state:", backgroundImage ? "CUSTOM IMAGE SET" : "DEFAULT IMAGE");

  return (
    <div className="min-h-screen relative">
      {/* White strip at top */}
      <div className="h-24 bg-white w-full"></div>
      
      {/* Background image container - positioned down by 1 inch */}
      <div 
        className="absolute top-24 bottom-0 left-0 right-0"
        style={{
          backgroundImage: (() => {
            console.log("🎨 Rendering background, current state:", backgroundImage ? "CUSTOM" : "DEFAULT");
            console.log("🔗 Rendering background, current ref:", backgroundImageRef.current ? "CUSTOM REF" : "DEFAULT REF");
            try {
              // Use ref first, then fallback to state, then default
              const imageData = backgroundImageRef.current || backgroundImage;
              const imageUrl = imageData ? `url(${imageData})` : 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)';
              console.log("🖼️ Using image URL:", imageData ? "CUSTOM DATA" : "DEFAULT IMAGE");
              return imageUrl;
            } catch (error) {
              console.error("❌ Error creating background image URL:", error);
              // Reset both on error
              backgroundImageRef.current = null;
              setBackgroundImage(null);
              return 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)';
            }
          })(),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-forest/40"></div>
      </div>
      
      {/* Upload Button - positioned in top right */}
      <Button
        onClick={triggerFileInput}
        size="sm"
        variant="outline"
        className="absolute z-30 top-6 right-6 bg-white/90 text-black border-white hover:bg-white px-4 py-2"
      >
        <Upload className="w-4 h-4 mr-2" />
        Change Background
      </Button>

      {/* Test Button - positioned below upload button */}
      <Button
        onClick={() => {
          console.log("🧪 Test button clicked - setting solid color background");
          setBackgroundImage("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2YjZiIi8+Cjwvc3ZnPgo=");
          backgroundImageRef.current = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2YjZiIi8+Cjwvc3ZnPgo=";
        }}
        size="sm"
        variant="outline"
        className="absolute z-30 top-16 right-6 bg-red-500/90 text-white border-red-500 hover:bg-red-600 px-4 py-2"
      >
        Test Red BG
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Main Title - positioned over the white strip */}
      <div className="absolute z-20 top-4 left-0 right-0 text-center">
        <h1 className="text-8xl mb-4 font-kaushan text-primary drop-shadow-lg">
          Welcome to Cabin Buddy
        </h1>
      </div>

      {/* Content - positioned to start where white strip ends */}
      <div className="absolute z-20 top-32 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col min-h-[calc(100vh-200px)]">
        <div className="mb-4">
          <p className="text-4xl text-red-600 text-center font-medium font-kaushan max-w-3xl mx-auto">
            Perfect for families and friends sharing a vacation property - coordinate bookings, track expenses, and manage everything together.
          </p>
        </div>

        {/* Action Buttons - moved to bottom */}
        <div className="flex flex-col sm:flex-row gap-4 mt-auto mb-8 justify-center">
          <Button 
            onClick={() => navigate("/login")}
            size="lg" 
            variant="outline"
            className="bg-white text-black border-white hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            Sign In / Sign Up
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
      </div>
    </div>
  );
};

export default Intro;
