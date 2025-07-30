import { Calendar, HomeIcon, Users, Settings, LogIn, ShoppingCart, Receipt, CheckCircle, Clock, Camera, FileText, DollarSign, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <Card className="text-center">
    <CardHeader>
      <div className="mx-auto mb-2">
        <Icon className="h-12 w-12 text-primary" />
      </div>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  </Card>
);

const Home = () => {
  const [backgroundImage, setBackgroundImage] = useState<string>("/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png");
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
    navigate('/dashboard');
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${backgroundImage})`
      }}
    >
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-6xl mx-auto text-center text-white">
          {/* Header */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 font-kaushan">
            Cabin Buddy
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto">
            Your complete cabin management solution. Streamline reservations, track expenses, and create unforgettable memories.
          </p>

          {/* Background Upload */}
          <Card className="mb-12 bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Customize Your Experience</CardTitle>
              <CardDescription className="text-white/80">
                Upload your own cabin photo to personalize this page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-white/90
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
              />
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <FeatureCard
              icon={Calendar}
              title="Smart Calendar"
              description="Manage reservations and bookings with an intuitive calendar system"
            />
            <FeatureCard
              icon={DollarSign}
              title="Expense Tracking"
              description="Keep track of all cabin-related expenses and generate financial reports"
            />
            <FeatureCard
              icon={CheckCircle}
              title="Automated Billing"
              description="Streamline your billing process with automated calculations and tracking"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3 bg-white/10 border-white/30 text-white hover:bg-white/20"
              asChild
            >
              <Link to="/auth">
                Sign In / Sign Up
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;