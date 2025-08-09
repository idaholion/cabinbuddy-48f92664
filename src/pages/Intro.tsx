import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        console.log("🧹 Clearing previous styles...");
        bgElement.style.backgroundColor = '';
        
        console.log("🖼️ Setting background image:", blobUrl);
        bgElement.style.setProperty('background-image', `url("${blobUrl}")`, 'important');
        bgElement.style.setProperty('background-size', 'cover', 'important');
        bgElement.style.setProperty('background-position', 'center', 'important');
        bgElement.style.setProperty('background-repeat', 'no-repeat', 'important');
        
        console.log("✅ All styles applied");
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
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/lovable-uploads/fcdc1ee2-fe83-4a6d-8a20-d72c6b7431eb.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
        ref={(el) => {
          if (el && !el.dataset.initialized) {
            el.dataset.initialized = 'true';
            // Set initial styles via JavaScript to match inline styles
            el.style.setProperty('background-image', 'url(/lovable-uploads/fcdc1ee2-fe83-4a6d-8a20-d72c6b7431eb.png)');
            el.style.setProperty('background-size', 'cover');
            el.style.setProperty('background-position', 'center center');
            el.style.setProperty('background-repeat', 'no-repeat');
          }
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-forest/40"></div>
      </div>
      
      {/* Main Title */}
      <div className="absolute z-20 top-8 left-0 right-0 text-center">
        <h1 className="text-6xl sm:text-8xl mb-4 font-kaushan text-primary drop-shadow-lg">
          Welcome to Cabin Buddy
        </h1>
      </div>

      {/* Content */}
      <div className="absolute z-20 top-40 sm:top-44 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col min-h-[calc(100vh-240px)]">
        <div className="mb-8 mt-auto">
          <p className="text-2xl sm:text-4xl text-red-600 text-center font-medium font-kaushan max-w-3xl mx-auto">
            Perfect for families and friends sharing a vacation property - coordinate bookings, track expenses, and manage everything together.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
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