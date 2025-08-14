import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Intro = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="min-h-screen relative">
      
      {/* Background image container */}
      <div
        data-background="true"
        className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: 'url(/lovable-uploads/d6d60442-2bb7-47fd-8782-98611fc53830.png)',
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

      {/* No overlaid text - background image contains the text */}

      {/* Action Buttons */}
      <div className="absolute z-20 bottom-8 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
      </div>
    </div>
  );
};

export default Intro;