
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
    navigate("/dashboard");
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <Home className="h-16 w-16 text-white mr-4" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Cabin Buddy
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Streamline your shared property management with our comprehensive calendar and billing solution. 
            Coordinate bookings, track expenses, and manage payments all in one place.
          </p>
        </div>

        {/* Upload Background Card */}
        <Card className="mb-8 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              <Upload className="h-5 w-5 mr-2" />
              Customize Your Background
            </CardTitle>
            <CardDescription>
              Upload a photo from your computer to personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <label htmlFor="background-upload" className="cursor-pointer">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Choose Background Image</span>
                </Button>
                <input
                  id="background-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {backgroundImage && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Background image uploaded successfully!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              title: "Smart Calendar",
              description: "Coordinate property bookings with an intuitive calendar system",
              icon: "📅"
            },
            {
              title: "Expense Tracking",
              description: "Monitor and categorize all property-related expenses",
              icon: "💰"
            },
            {
              title: "Automated Billing",
              description: "Generate and manage bills automatically for all co-owners",
              icon: "🧾"
            }
          ].map((feature, index) => (
            <Card key={index} className="bg-white/95 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Get Started Button */}
        <Button 
          onClick={handleGetStarted}
          size="lg" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
        >
          Get Started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Intro;
