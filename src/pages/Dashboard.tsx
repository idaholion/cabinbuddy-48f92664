import { Calendar, Home, Users, Settings, LogIn, ShoppingCart, Receipt, CheckCircle, Clock, LogOut, Camera, User, Shield, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSupervisor } from "@/hooks/useSupervisor";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { JoinOrganizationDialog } from "@/components/JoinOrganizationDialog";
import { FeedbackButton } from "@/components/FeedbackButton";
import { UserOnboarding } from "@/components/UserOnboarding";
import { DashboardStats } from "@/components/DashboardStats";
import { QuickActions } from "@/components/QuickActions";
import { GlobalSearch } from "@/components/GlobalSearch";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import cabinDashboard from "@/assets/cabin-dashboard.jpg";

const UserInfo = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium">
        <User className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline truncate max-w-[100px] sm:max-w-none">
          {user?.user_metadata?.first_name || user?.email}
        </span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={signOut}
        className="text-xs sm:text-sm font-medium"
      >
        <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Logout</span>
        <span className="sm:hidden">Out</span>
      </Button>
    </div>
  );
};

const Dashboard = () => {
  const { isSupervisor } = useSupervisor();
  
  // Monitor performance
  usePerformanceMonitoring();

  useEffect(() => {
    console.log("Dashboard component mounted, checking font");
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      console.log("Title element found:", titleElement);
      console.log("Current font family:", window.getComputedStyle(titleElement).fontFamily);
      console.log("Font style:", window.getComputedStyle(titleElement).fontStyle);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* User Onboarding */}
      <UserOnboarding />
      
      {/* Mobile Search */}
      <div className="md:hidden">
        <GlobalSearch />
      </div>
      
      {/* Dashboard Stats */}
      <DashboardStats />
      
      {/* Hero Section with Quick Actions */}
      <div className="relative overflow-hidden rounded-lg bg-cover bg-center bg-no-repeat min-h-[400px] md:min-h-[500px]" style={{
        backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
      }}>
        <div className="absolute inset-0 bg-gradient-forest/60"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 py-8">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl mb-6 font-kaushan text-white drop-shadow-lg">
            Welcome to Cabin Buddy
          </h1>
          <p className="text-lg text-white/90 mb-8 max-w-2xl">
            Manage your cabin experience with ease. From reservations to check-ins, we've got you covered.
          </p>
          
          {/* Featured Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
            <Button className="bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-4 text-base font-semibold h-auto" size="lg" asChild>
              <Link to="/calendar" className="flex flex-col items-center gap-2">
                <Calendar className="h-6 w-6" />
                <span>Cabin Calendar</span>
                <span className="text-xs opacity-90">View reservations</span>
              </Link>
            </Button>
            
            <Button className="bg-card/95 hover:bg-card text-card-foreground px-6 py-4 text-base font-medium h-auto" variant="secondary" asChild>
              <Link to="/check-in" className="flex flex-col items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                <span>Check In</span>
                <span className="text-xs opacity-70">Arrival process</span>
              </Link>
            </Button>

            <Button className="bg-accent/90 hover:bg-accent text-accent-foreground px-6 py-4 text-base font-medium h-auto" variant="secondary" asChild>
              <Link to="/photos" className="flex flex-col items-center gap-2">
                <Camera className="h-6 w-6" />
                <span>Family Photos</span>
                <span className="text-xs opacity-70">Share memories</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* All Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <QuickActions variant="grid" showAll />
      </div>

      {/* Feedback Button */}
      <FeedbackButton />
    </div>
  );
};

export default Dashboard;