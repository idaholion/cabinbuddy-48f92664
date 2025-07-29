import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { 
  Home, 
  Settings, 
  Users, 
  Calendar, 
  FileText, 
  Receipt, 
  Image,
  CheckSquare,
  ChevronRight,
  Crown,
  Building2
} from "lucide-react";

const BreadcrumbDemo = () => {
  const navigate = useNavigate();

  const demoRoutes = [
    {
      category: "Setup & Configuration",
      icon: Settings,
      routes: [
        { path: "/setup", title: "Main Setup", description: "Dashboard › Setup" },
        { path: "/family-setup", title: "Family Setup", description: "Dashboard › Setup › Family Setup" },
        { path: "/family-group-setup", title: "Family Group Setup", description: "Dashboard › Setup › Family Group Setup" },
        { path: "/financial-setup", title: "Financial Setup", description: "Dashboard › Setup › Financial Setup" },
        { path: "/reservation-setup", title: "Reservation Setup", description: "Dashboard › Setup › Reservation Setup" },
      ]
    },
    {
      category: "Cabin Management",
      icon: Home,
      routes: [
        { path: "/calendar", title: "Cabin Calendar", description: "Dashboard › Cabin Calendar" },
        { path: "/check-in", title: "Check In", description: "Dashboard › Check In" },
        { path: "/daily-check-in", title: "Daily Check In", description: "Dashboard › Daily Check In" },
        { path: "/checkout-list", title: "Checkout List", description: "Dashboard › Checkout List" },
        { path: "/checkout-final", title: "Final Checkout", description: "Dashboard › Final Checkout" },
      ]
    },
    {
      category: "Documentation & Media",
      icon: FileText,
      routes: [
        { path: "/cabin-rules", title: "Cabin Rules", description: "Dashboard › Cabin Rules" },
        { path: "/documents", title: "Documents", description: "Dashboard › Documents" },
        { path: "/cabin-seasonal-docs", title: "Seasonal Documents", description: "Dashboard › Seasonal Documents" },
        { path: "/photos", title: "Photo Sharing", description: "Dashboard › Photo Sharing" },
      ]
    },
    {
      category: "Financial Management",
      icon: Receipt,
      routes: [
        { path: "/add-receipt", title: "Add Receipt", description: "Dashboard › Add Receipt" },
        { path: "/finance-reports", title: "Financial Reports", description: "Dashboard › Financial Reports" },
        { path: "/shopping-list", title: "Shopping List", description: "Dashboard › Shopping List" },
      ]
    },
    {
      category: "Supervisor Features",
      icon: Crown,
      routes: [
        { path: "/supervisor", title: "Supervisor Dashboard", description: "Dashboard › Supervisor" },
      ]
    },
    {
      category: "Organization Selection",
      icon: Building2,
      routes: [
        { path: "/select-organization", title: "Select Organization", description: "Dashboard › Select Organization" },
        { path: "/select-family-group", title: "Select Family Group", description: "Dashboard › Select Family Group" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckSquare className="h-8 w-8" />
            <ChevronRight className="h-6 w-6" />
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Breadcrumb Navigation Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore the dynamic breadcrumb system that provides contextual navigation throughout the cabin management application.
          </p>
        </div>

        {/* Features Overview */}
        <Card className="border-primary/20 bg-gradient-to-r from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Breadcrumb Features
            </CardTitle>
            <CardDescription>
              Our breadcrumb system provides intelligent navigation with these key features:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="font-semibold text-primary">Dynamic Generation</div>
                <div className="text-sm text-muted-foreground">
                  Automatically generates breadcrumbs based on current route and context
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Contextual Information</div>
                <div className="text-sm text-muted-foreground">
                  Shows organization names and other relevant context data
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Quick Navigation</div>
                <div className="text-sm text-muted-foreground">
                  Click any breadcrumb level to quickly jump to that section
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Visual Hierarchy</div>
                <div className="text-sm text-muted-foreground">
                  Clear visual indication of current location in the app
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Routes */}
        <div className="grid gap-6">
          {demoRoutes.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.category}
                </CardTitle>
                <CardDescription>
                  Click any route below to see the breadcrumb navigation in action
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-0">
                  {category.routes.map((route, routeIndex) => (
                    <div 
                      key={routeIndex}
                      className="p-4 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{route.title}</div>
                          <div className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                            {route.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{route.path}</Badge>
                          <Button asChild size="sm" variant="outline">
                            <Link to={route.path}>
                              Visit Page
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Special Supervisor Demo */}
        <Card className="border-amber-200 bg-gradient-to-r from-background to-amber-50/50 dark:to-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Crown className="h-5 w-5" />
              Supervisor Dynamic Breadcrumbs
            </CardTitle>
            <CardDescription>
              Supervisor breadcrumbs include organization names fetched dynamically from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="font-mono text-sm space-y-2">
                <div>Dashboard › Supervisor › <span className="text-primary font-bold">[Organization Name]</span> › Family Groups</div>
                <div>Dashboard › Supervisor › <span className="text-primary font-bold">[Organization Name]</span> › Financial Management</div>
                <div>Dashboard › Supervisor › <span className="text-primary font-bold">[Organization Name]</span> › Reservation Management</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Organization names are fetched from the database in real-time and displayed in the breadcrumbs for better context.
            </p>
            <Button asChild variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:text-amber-400">
              <Link to="/supervisor">
                <Crown className="h-4 w-4 mr-2" />
                Try Supervisor Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Implementation Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Details</CardTitle>
            <CardDescription>
              Technical overview of the breadcrumb system architecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Core Components</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <code className="bg-muted px-1 rounded">useBreadcrumbs</code> - Custom hook for breadcrumb logic</li>
                  <li>• <code className="bg-muted px-1 rounded">AppBreadcrumbs</code> - React component for rendering</li>
                  <li>• <code className="bg-muted px-1 rounded">MainLayout</code> - Layout integration</li>
                  <li>• <code className="bg-muted px-1 rounded">Breadcrumb UI</code> - Shadcn/ui components</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Key Features</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Route-based automatic generation</li>
                  <li>• Database integration for context</li>
                  <li>• React Router navigation support</li>
                  <li>• Responsive design system styling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80">
            <Link to="/home">
              <Home className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbDemo;