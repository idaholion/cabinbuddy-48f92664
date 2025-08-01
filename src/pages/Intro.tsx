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
    navigate("/home");
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
      {/* White strip at top */}
      <div className="h-24 bg-white w-full"></div>
      
      {/* Background image container */}
      <div 
        data-background="true"
        className="absolute top-24 bottom-0 left-0 right-0"
        style={{
          backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-forest/40"></div>
      </div>
      
      {/* Upload Button */}
      <Button
        onClick={triggerFileInput}
        size="sm"
        variant="outline"
        className="absolute z-30 top-6 right-6 bg-white/90 text-black border-white hover:bg-white px-4 py-2"
      >
        <Upload className="w-4 h-4 mr-2" />
        Change Background
      </Button>

      {/* Test Button - Debug */}
      <Button
        onClick={() => {
          const bgElement = document.querySelector('[data-background="true"]') as HTMLElement;
          if (bgElement) {
            bgElement.style.backgroundColor = 'red';
            bgElement.style.backgroundImage = 'none';
            console.log("✅ Test: Background changed to red");
          } else {
            console.error("❌ Test: Background element not found");
          }
        }}
        size="sm"
        variant="outline"
        className="absolute z-30 top-16 right-6 bg-red-500/90 text-white border-red-500 hover:bg-red-600 px-4 py-2"
      >
        Test Red
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        onInput={(e) => console.log("🔥 onInput triggered:", (e.target as HTMLInputElement).files?.length)}
        onClick={(e) => console.log("🔥 File input clicked")}
        className="hidden"
      />

      {/* Main Title */}
      <div className="absolute z-20 top-4 left-0 right-0 text-center">
        <h1 className="text-8xl mb-4 font-kaushan text-primary drop-shadow-lg">
          Welcome to Cabin Buddy
        </h1>
      </div>

      {/* Content */}
      <div className="absolute z-20 top-32 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col min-h-[calc(100vh-200px)]">
        <div className="mb-4">
          <p className="text-4xl text-red-600 text-center font-medium font-kaushan max-w-3xl mx-auto">
            Perfect for families and friends sharing a vacation property - coordinate bookings, track expenses, and manage everything together.
          </p>
        </div>

        {/* Action Buttons */}
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