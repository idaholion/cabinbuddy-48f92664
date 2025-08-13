import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Play, ArrowLeft, Bug, Eye } from 'lucide-react';

interface DebugScreen {
  name: string;
  path: string;
  description: string;
  category: 'Auth' | 'Onboarding' | 'Setup' | 'Main App' | 'Admin' | 'Utility';
}

const debugScreens: DebugScreen[] = [
  // Auth Flow
  { name: 'Login', path: '/login', description: 'User login screen', category: 'Auth' },
  { name: 'Signup', path: '/signup', description: 'User registration screen', category: 'Auth' },
  { name: 'Reset Password', path: '/reset-password', description: 'Password reset screen', category: 'Auth' },
  { name: 'Auth', path: '/auth', description: 'Authentication landing page', category: 'Auth' },
  
  // Onboarding Flow
  { name: 'Onboarding', path: '/onboarding', description: 'New user onboarding screen', category: 'Onboarding' },
  { name: 'Intro', path: '/intro', description: 'Introduction screen', category: 'Onboarding' },
  
  // Setup Flow
  { name: 'Setup', path: '/setup', description: 'Initial setup screen', category: 'Setup' },
  { name: 'Select Organization', path: '/select-organization', description: 'Organization selection', category: 'Setup' },
  { name: 'Select Family Group', path: '/select-family-group', description: 'Family group selection', category: 'Setup' },
  { name: 'Family Setup', path: '/family-setup', description: 'Family configuration screen', category: 'Setup' },
  { name: 'Family Group Setup', path: '/family-group-setup', description: 'Family group configuration', category: 'Setup' },
  { name: 'Reservation Setup', path: '/reservation-setup', description: 'Reservation system setup', category: 'Setup' },
  { name: 'Financial Setup', path: '/financial-setup', description: 'Financial system setup', category: 'Setup' },
  
  // Main App
  { name: 'Home', path: '/', description: 'Main dashboard/home screen', category: 'Main App' },
  { name: 'Index', path: '/index', description: 'Alternative main screen', category: 'Main App' },
  { name: 'Cabin Calendar', path: '/cabin-calendar', description: 'Reservation calendar', category: 'Main App' },
  { name: 'Check In', path: '/check-in', description: 'Check-in screen', category: 'Main App' },
  { name: 'Daily Check In', path: '/daily-check-in', description: 'Daily check-in form', category: 'Main App' },
  { name: 'Checkout List', path: '/checkout-list', description: 'Checkout task list', category: 'Main App' },
  { name: 'Checkout Final', path: '/checkout-final', description: 'Final checkout screen', category: 'Main App' },
  { name: 'Documents', path: '/documents', description: 'Document management', category: 'Main App' },
  { name: 'Cabin Rules', path: '/cabin-rules', description: 'Cabin rules and policies', category: 'Main App' },
  { name: 'Cabin Seasonal Docs', path: '/cabin-seasonal-docs', description: 'Seasonal documentation', category: 'Main App' },
  { name: 'Photo Sharing', path: '/photo-sharing', description: 'Photo gallery and sharing', category: 'Main App' },
  { name: 'Shopping List', path: '/shopping-list', description: 'Shared shopping lists', category: 'Main App' },
  { name: 'Stay History', path: '/stay-history', description: 'User stay history', category: 'Main App' },
  { name: 'Work Weekends', path: '/work-weekends', description: 'Work weekend management', category: 'Main App' },
  { name: 'Host Profile', path: '/host-profile', description: 'Host profile management', category: 'Main App' },
  { name: 'Messaging', path: '/messaging', description: 'Communication system', category: 'Main App' },
  { name: 'Add Receipt', path: '/add-receipt', description: 'Receipt submission', category: 'Main App' },
  
  // Admin Features
  { name: 'Financial Dashboard', path: '/financial-dashboard', description: 'Financial overview for admins', category: 'Admin' },
  { name: 'Calendar Keeper Management', path: '/calendar-keeper-management', description: 'Calendar keeper administration', category: 'Admin' },
  { name: 'Supervisor Dashboard', path: '/supervisor', description: 'Supervisor management interface', category: 'Admin' },
  { name: 'Supervisor Family Groups', path: '/supervisor/organization/family-groups', description: 'Family group management', category: 'Admin' },
  { name: 'Supervisor Reservations', path: '/supervisor/organization/reservation', description: 'Reservation management', category: 'Admin' },
  { name: 'Supervisor Financial', path: '/supervisor/organization/financial', description: 'Financial management', category: 'Admin' },
  { name: 'Data Backup', path: '/data-backup', description: 'Data backup and restore', category: 'Admin' },
  
  // Utility Pages
  { name: 'Demo', path: '/demo', description: 'Demo and testing page', category: 'Utility' },
  { name: 'Font Showcase', path: '/font-showcase', description: 'Typography demonstration', category: 'Utility' },
  { name: 'Breadcrumb Demo', path: '/breadcrumb-demo', description: 'Breadcrumb component demo', category: 'Utility' },
];

export const DebugModePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(debugScreens.map(screen => screen.category)))];

  const filteredScreens = debugScreens.filter(screen => {
    const matchesSearch = screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         screen.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || screen.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleNavigateToScreen = (path: string) => {
    navigate(`${path}?debug=true`);
  };

  const handleExitDebugMode = () => {
    navigate('/supervisor');
  };

  const isInDebugMode = location.search.includes('debug=true');

  return (
    <div className="space-y-6">
      {/* Debug Mode Header */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800 dark:text-orange-200">Debug Mode</CardTitle>
            </div>
            {isInDebugMode && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExitDebugMode}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Debug Mode
              </Button>
            )}
          </div>
          <CardDescription className="text-orange-700 dark:text-orange-300">
            Access any screen in the application for testing and review. 
            Navigate to screens without authentication restrictions.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search screens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Screens Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredScreens.map((screen) => (
          <Card key={screen.path} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{screen.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {screen.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {screen.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {screen.path}
                </code>
                <Button 
                  size="sm"
                  onClick={() => handleNavigateToScreen(screen.path)}
                  className="ml-2"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredScreens.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No screens found</h3>
            <p className="text-muted-foreground text-center">
              Try adjusting your search terms or category filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};