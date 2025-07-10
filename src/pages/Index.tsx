import { Calendar, Home, Users, Settings, LogIn, ShoppingCart, Receipt, CheckCircle, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import cabinHero from "@/assets/cabin-hero.jpg";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* Top Navigation */}
      <nav className="relative z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Button variant="ghost" className="text-sm font-medium">
                Login
              </Button>
              <Button variant="ghost" className="text-sm font-medium bg-primary/10 text-primary">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button variant="ghost" className="text-sm font-medium">
                Set-up Family Organization
              </Button>
              <Button variant="ghost" className="text-sm font-medium">
                Set-up Financials
              </Button>
              <Button variant="ghost" className="text-sm font-medium">
                More
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <LogIn className="h-4 w-4 mr-2" />
              Log In
            </Button>
          </div>
        </div>
      </nav>

      {/* Full Screen Hero with Action Buttons */}
      <div 
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cabinHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-forest/40"></div>
        
        {/* Main Title */}
        <div className="relative z-10 pt-20 pb-16 text-center">
          <h1 className="text-6xl font-bold text-primary-foreground mb-4">
            Welcome to Cabin Buddy
          </h1>
        </div>

        {/* Action Buttons Overlay */}
        <div className="relative z-10 px-8">
          {/* Cabin Calendar - Large button on left */}
          <Button 
            className="absolute left-8 top-32 bg-primary/90 hover:bg-primary text-primary-foreground px-8 py-6 text-xl font-semibold shadow-warm"
            size="lg"
          >
            <Calendar className="h-6 w-6 mr-3" />
            Cabin Calendar
          </Button>

          {/* Right side buttons cluster */}
          <div className="absolute right-8 top-24 space-y-4">
            {/* Arrival Check In */}
            <Button 
              className="bg-card/95 hover:bg-card text-card-foreground px-6 py-4 text-lg font-medium shadow-cabin w-64"
              variant="secondary"
            >
              <CheckCircle className="h-5 w-5 mr-3" />
              Arrival Check In
            </Button>

            {/* Daily Cabin Check In */}
            <Button 
              className="bg-card/95 hover:bg-card text-card-foreground px-6 py-4 text-lg font-medium shadow-cabin w-64"
              variant="secondary"
            >
              <Clock className="h-5 w-5 mr-3" />
              Daily Cabin Check In
            </Button>

            {/* Shopping List and Add Receipt - smaller buttons side by side */}
            <div className="flex space-x-2">
              <Button 
                className="bg-accent/90 hover:bg-accent text-accent-foreground px-4 py-3 font-medium shadow-cabin flex-1"
                variant="secondary"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Shopping List
              </Button>
              <Button 
                className="bg-accent/90 hover:bg-accent text-accent-foreground px-4 py-3 font-medium shadow-cabin flex-1"
                variant="secondary"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Add Receipt
              </Button>
            </div>

            {/* Check Out */}
            <Button 
              className="bg-secondary/95 hover:bg-secondary text-secondary-foreground px-6 py-4 text-lg font-medium shadow-cabin w-64"
              variant="secondary"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Check Out
            </Button>
          </div>

          {/* Bottom buttons */}
          <div className="absolute bottom-16 left-8 right-8 flex justify-between">
            {/* Edit Master Setup */}
            <Button 
              className="bg-muted/95 hover:bg-muted text-muted-foreground px-6 py-3 font-medium shadow-cabin"
              variant="secondary"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Master Setup
            </Button>

            {/* Edit Family Group */}
            <Button 
              className="bg-muted/95 hover:bg-muted text-muted-foreground px-6 py-3 font-medium shadow-cabin"
              variant="secondary"
            >
              <Users className="h-4 w-4 mr-2" />
              Edit Family Group
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;