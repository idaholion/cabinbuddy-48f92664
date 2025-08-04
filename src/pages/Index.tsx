
import { Calendar, Home, Users, Settings, LogIn, ShoppingCart, Receipt, CheckCircle, Clock, LogOut, Camera, User, Shield, Plus, UserPlus, MoreHorizontal, FileText, CreditCard, DollarSign, Building, ClipboardList, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useSupervisor } from "@/hooks/useSupervisor";
import { JoinOrganizationDialog } from "@/components/JoinOrganizationDialog";
import { FeedbackButton } from "@/components/FeedbackButton";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { useMultiOrganization } from "@/hooks/useMultiOrganization";
import cabinDashboard from "@/assets/cabin-dashboard.jpg";

const UserInfo = () => {
  const { user } = useAuth();

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 text-sm font-medium">
        <User className="h-4 w-4" />
        <span>
          {user?.user_metadata?.first_name || user?.email}
        </span>
      </div>
    </div>
  );
};

const Index = () => {
  const { isSupervisor } = useSupervisor();
  const { isGroupLead, isHostMember, loading: roleLoading } = useUserRole();
  const { activeOrganization } = useMultiOrganization();
  const { signOut } = useAuth();
  
  // Monitor performance
  usePerformanceMonitoring();

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
              {/* Organization Management Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-sm font-medium">
                    <Users className="h-4 w-4 mr-2" />
                    Organizations
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/select-organization">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Organizations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <JoinOrganizationDialog>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Organization
                    </DropdownMenuItem>
                  </JoinOrganizationDialog>
                  <DropdownMenuItem asChild>
                    <Link to="/family-setup?mode=create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Organization
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {isSupervisor && (
                <Button variant="ghost" className="text-sm font-medium text-primary" asChild>
                  <Link to="/supervisor">
                    <Shield className="h-4 w-4 mr-2" />
                    Supervisor
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <UserInfo />
            </div>
          </div>
        </div>
      </nav>

      {/* Full Screen Hero with Action Buttons */}
      <div className="relative min-h-screen bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
      }}>
        <div className="absolute inset-0 bg-gradient-forest/40"></div>
        
        {/* Main Title */}
        <div className="relative z-10 pt-8 pb-16 text-center">
          <h1 className="text-8xl mb-4 font-kaushan text-primary drop-shadow-lg">
            Welcome to Cabin Buddy
          </h1>
        </div>

        {/* Action Buttons Overlay */}
        <div className="relative z-10 px-8">
          {/* Cabin Calendar - Large button on left */}
          <Button className="absolute left-8 top-32 px-8 py-6 text-xl font-semibold shadow-warm" variant="default" size="lg" asChild>
            <Link to="/calendar">
              <Calendar className="h-6 w-6 mr-3" />
              Cabin Calendar
            </Link>
          </Button>

          {/* Right side buttons cluster */}
          <div className="absolute right-32 top-24 space-y-4 w-64">
            {/* Main action buttons - all same width */}
            <Button className="px-6 py-4 text-lg font-medium shadow-cabin w-full" variant="outline" asChild>
              <Link to="/check-in">
                <CheckCircle className="h-5 w-5 mr-3" />
                Arrival Check In
              </Link>
            </Button>

            <Button className="px-6 py-4 text-lg font-medium shadow-cabin w-full" variant="outline" asChild>
              <Link to="/daily-check-in">
                <Clock className="h-5 w-5 mr-3" />
                Daily Cabin Check In
              </Link>
            </Button>

            <Button className="px-6 py-4 text-lg font-medium shadow-cabin w-full" variant="outline" asChild>
              <Link to="/checkout-list">
                <LogOut className="h-5 w-5 mr-3" />
                Check Out
              </Link>
            </Button>

            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="px-6 py-4 text-lg font-medium shadow-cabin w-full" variant="outline">
                  <MoreHorizontal className="h-5 w-5 mr-3" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/add-receipt">
                    <Receipt className="h-4 w-4 mr-2" />
                    Add Receipt
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/shopping-list">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Shopping List
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/documents">
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/photos">
                    <Camera className="h-4 w-4 mr-2" />
                    Family Photos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cabin-rules">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Cabin Rules
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cabin-seasonal-docs">
                    <FileText className="h-4 w-4 mr-2" />
                    Cabin Seasonal Docs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/data-backup">
                    <Database className="h-4 w-4 mr-2" />
                    Data Restore
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/financial-review">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Finance Report
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/host-profile">
                    <User className="h-4 w-4 mr-2" />
                    Host Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/financial-review">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Financial Review
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Role-based Setup Options */}
            {!roleLoading && (
              <>
                {isGroupLead && (
                  <Button className="px-6 py-4 text-lg font-medium shadow-cabin w-64 bg-primary/10 text-primary border-primary" variant="outline" asChild>
                    <Link to="/family-group-setup">
                      <Users className="h-5 w-5 mr-3" />
                      Family Group Setup
                    </Link>
                  </Button>
                )}
                {isHostMember && (
                  <></>
                )}
              </>
            )}

          </div>

        </div>

        {/* Feedback Button */}
        <div className="fixed bottom-8 left-8 z-30">
          <FeedbackButton />
        </div>
      </div>
    </div>
  );
};

export default Index;
