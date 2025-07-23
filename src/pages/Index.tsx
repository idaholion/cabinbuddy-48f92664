
import { Calendar, Home, Users, Settings, LogIn, ShoppingCart, Receipt, CheckCircle, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import cabinDashboard from "@/assets/cabin-dashboard.jpg";

const Index = () => {
  useEffect(() => {
    console.log("Index component mounted, checking font");
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      console.log("Title element found:", titleElement);
      console.log("Current font family:", window.getComputedStyle(titleElement).fontFamily);
      console.log("Font style:", window.getComputedStyle(titleElement).fontStyle);
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Top Navigation */}
      <nav className="relative z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Button variant="ghost" className="text-sm font-medium bg-primary/10 text-primary">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button variant="ghost" className="text-sm font-medium" asChild>
                <Link to="/family-setup">Set-up Family Organization</Link>
              </Button>
              <Button variant="ghost" className="text-sm font-medium" asChild>
                <Link to="/financial-setup">Set-up Financials</Link>
              </Button>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Full Screen Hero with Action Buttons */}
      <div className="relative min-h-screen bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
      }}>
        <div className="absolute inset-0 bg-gradient-forest/40"></div>
        
        {/* Main Title */}
        <div className="relative z-10 pt-20 pb-16 text-center">
          <h1 className="text-8xl mb-4" style={{fontFamily: '"Brush Script MT", cursive', fontSize: '6rem', color: 'red'}}>
            Welcome to Cabin Buddy
          </h1>
        </div>

        {/* Action Buttons Overlay */}
        <div className="relative z-10 px-8">
          {/* Cabin Calendar - Large button on left */}
          <Button className="absolute left-8 top-32 bg-primary/90 hover:bg-primary text-primary-foreground px-8 py-6 text-xl font-semibold shadow-warm" size="lg" asChild>
            <Link to="/calendar">
              <Calendar className="h-6 w-6 mr-3" />
              Cabin Calendar
            </Link>
          </Button>

          {/* Right side buttons cluster */}
          <div className="absolute right-8 top-24 space-y-4">
            {/* Arrival Check In */}
            <Button className="bg-card/95 hover:bg-card text-card-foreground px-6 py-4 text-lg font-medium shadow-cabin w-64" variant="secondary" asChild>
              <Link to="/check-in">
                <CheckCircle className="h-5 w-5 mr-3" />
                Arrival Check In
              </Link>
            </Button>

            {/* Daily Cabin Check In */}
            <Button className="bg-card/95 hover:bg-card text-card-foreground px-6 py-4 text-lg font-medium shadow-cabin w-64" variant="secondary" asChild>
              <Link to="/daily-check-in">
                <Clock className="h-5 w-5 mr-3" />
                Daily Cabin Check In
              </Link>
            </Button>

            {/* Shopping List and Add Receipt - smaller buttons side by side */}
            <div className="flex space-x-2">
              <Button className="bg-accent/90 hover:bg-accent text-accent-foreground px-4 py-3 font-medium shadow-cabin flex-1" variant="secondary" asChild>
                <Link to="/shopping-list">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Shopping List
                </Link>
              </Button>
              <Button className="bg-accent/90 hover:bg-accent text-accent-foreground px-4 py-3 font-medium shadow-cabin flex-1" variant="secondary" asChild>
                <Link to="/add-receipt">
                  <Receipt className="h-4 w-4 mr-2" />
                  Add Receipt
                </Link>
              </Button>
            </div>

            {/* Check Out */}
            <Button className="bg-secondary/95 hover:bg-secondary text-secondary-foreground px-6 py-4 text-lg font-medium shadow-cabin w-64" variant="secondary">
              <LogOut className="h-5 w-5 mr-3" />
              Check Out
            </Button>
          </div>

          {/* Bottom buttons */}
          <div className="absolute bottom-8 left-8 right-8 flex justify-center">
            {/* Edit Master Setup */}
            <Button variant="secondary" className="bg-muted/95 hover:bg-muted text-muted-foreground px-6 py-3 font-medium shadow-cabin">
              <Settings className="h-4 w-4 mr-2" />
              Edit Master Setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
