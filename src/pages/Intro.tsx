
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Intro = () => {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetStarted = () => {
    navigate("/home");
  };

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-forest/40"></div>
      
      {/* Main Title */}
      <div className="relative z-10 pt-4 pb-4 text-center">
        <h1 className="text-8xl mb-4 font-kaushan text-primary drop-shadow-lg">
          Welcome to Cabin Buddy
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col min-h-[calc(100vh-200px)]">
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
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold"
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
