import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RobustOrganizationRoute } from "@/components/RobustOrganizationRoute";
import { UnifiedAuthRoute } from "@/components/UnifiedAuthRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { useEnhancedErrorTracking } from '@/hooks/useEnhancedErrorTracking';
import { useLaunchAnalytics, usePageTracking } from '@/hooks/useLaunchAnalytics';
import { NetworkStatusProvider } from '@/components/NetworkStatusProvider';

// Eager load frequently used pages
import Intro from "./pages/Intro";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Setup from "./pages/Setup";
import SelectFamilyGroup from "./pages/SelectFamilyGroup";
import CabinCalendar from "./pages/CabinCalendar";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Textresponse from "./pages/Textresponse";
import { ManageOrganizations } from "./pages/ManageOrganizations";


// Lazy load setup pages (used less frequently)
const FamilySetup = React.lazy(() => import("./pages/FamilySetup"));
const FamilyGroupSetup = React.lazy(() => import("./pages/FamilyGroupSetup"));
const HostProfile = React.lazy(() => import("./pages/HostProfile"));
const FinancialDashboard = React.lazy(() => import("./pages/FinancialDashboard"));
const ReservationSetup = React.lazy(() => import("./pages/ReservationSetup"));
const FinancialSetupPage = React.lazy(() => import("./pages/FinancialSetupPage"));

// Lazy load other complex pages
const CheckIn = React.lazy(() => import("./pages/CheckIn"));
const DailyCheckIn = React.lazy(() => import("./pages/DailyCheckIn"));
const AddReceipt = React.lazy(() => import("./pages/AddReceipt"));
const ShoppingList = React.lazy(() => import("./pages/ShoppingList"));
const CabinRules = React.lazy(() => import("./pages/CabinRules"));
const Documents = React.lazy(() => import("./pages/Documents"));
const CabinSeasonalDocs = React.lazy(() => import("./pages/CabinSeasonalDocs"));
const CheckoutList = React.lazy(() => import("./pages/CheckoutList"));
const CheckoutFinal = React.lazy(() => import("./pages/CheckoutFinal"));
const StayHistory = React.lazy(() => import("./pages/StayHistory"));
const PhotoSharing = React.lazy(() => import("./pages/PhotoSharing"));
const DataBackup = React.lazy(() => import("./pages/DataBackup"));
const Messaging = React.lazy(() => import("./pages/Messaging"));
const Demo = React.lazy(() => import("./pages/Demo"));
const CalendarKeeperManagement = React.lazy(() => import("./pages/CalendarKeeperManagement"));
const FamilyVoting = React.lazy(() => import("./pages/FamilyVoting"));

// Lazy load admin/supervisor pages
const SupervisorDashboard = React.lazy(() => import("./pages/SupervisorDashboard").then(module => ({ default: module.SupervisorDashboard })));
const SupervisorOrganizationFamilyGroups = React.lazy(() => import("./pages/SupervisorOrganizationFamilyGroups"));



// Lazy load utility pages
const FontShowcase = React.lazy(() => import("./pages/FontShowcase"));
const BreadcrumbDemo = React.lazy(() => import("./pages/BreadcrumbDemo"));

import { SupervisorRoute } from "./components/SupervisorRoute";
import { AdminTreasurerRoute } from "./components/AdminTreasurerRoute";
import { DebugRoute } from "./components/DebugRoute";
import { MainLayout } from "./components/MainLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const AppContent = () => {
  // Initialize monitoring and analytics
  usePerformanceMonitoring();
  useEnhancedErrorTracking();
  useLaunchAnalytics(); // This includes page tracking, so no need for duplicate

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DebugRoute><Intro /></DebugRoute>} />
        <Route path="/intro" element={<DebugRoute><Intro /></DebugRoute>} />
        <Route path="/auth" element={<DebugRoute><Auth /></DebugRoute>} />
        <Route path="/login" element={<DebugRoute><Login /></DebugRoute>} />
        <Route path="/signup" element={<DebugRoute><Signup /></DebugRoute>} />
        <Route path="/reset-password" element={<DebugRoute><ResetPassword /></DebugRoute>} />
        <Route path="/textresponse" element={<Textresponse />} />
        <Route path="/home" element={<DebugRoute><UnifiedAuthRoute><MainLayout><Index /></MainLayout></UnifiedAuthRoute></DebugRoute>} />
        <Route path="/manage-organizations" element={<DebugRoute><UnifiedAuthRoute requiresOrganization={false}><ManageOrganizations /></UnifiedAuthRoute></DebugRoute>} />
        <Route path="/onboarding" element={<Navigate to="/manage-organizations" replace />} />
        <Route path="/setup" element={<DebugRoute><ProtectedRoute><MainLayout><Setup /></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/calendar" element={<DebugRoute><ProtectedRoute><MainLayout><CabinCalendar /></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/check-in" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CheckIn /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/daily-check-in" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><DailyCheckIn /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/checkout-list" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CheckoutList /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/checkout-final" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CheckoutFinal /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/shopping-list" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><ShoppingList /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/add-receipt" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><AddReceipt /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/stay-history" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><StayHistory /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/cabin-rules" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CabinRules /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/documents" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><Documents /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/cabin-seasonal-docs" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CabinSeasonalDocs /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/photos" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><PhotoSharing /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/reservation-setup" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><ReservationSetup /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/data-backup" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><DataBackup /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        
        <Route path="/family-setup" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><FamilySetup /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/select-family-group" element={<DebugRoute><ProtectedRoute><MainLayout><SelectFamilyGroup /></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/family-group-setup" element={<DebugRoute><ProtectedRoute><Suspense fallback={<LoadingSpinner />}><FamilyGroupSetup /></Suspense></ProtectedRoute></DebugRoute>} />
        <Route path="/host-profile" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><HostProfile /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/finance-reports" element={<DebugRoute><AdminTreasurerRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><FinancialDashboard /></Suspense></MainLayout></AdminTreasurerRoute></DebugRoute>} />
        <Route path="/financial-setup" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><FinancialSetupPage /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/admin-treasurer" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/admin/treasurer" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/messaging" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><Messaging /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/calendar-keeper-management" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CalendarKeeperManagement /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/family-voting" element={<DebugRoute><ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><FamilyVoting /></Suspense></MainLayout></ProtectedRoute></DebugRoute>} />
        <Route path="/payment-tracking" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/demo" element={<DebugRoute><Suspense fallback={<LoadingSpinner />}><Demo /></Suspense></DebugRoute>} />
        <Route path="/supervisor" element={<DebugRoute><SupervisorRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><SupervisorDashboard /></Suspense></MainLayout></SupervisorRoute></DebugRoute>} />
        <Route path="/supervisor/organization/:organizationId/family-groups" element={<DebugRoute><SupervisorRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><SupervisorOrganizationFamilyGroups /></Suspense></MainLayout></SupervisorRoute></DebugRoute>} />
        
        
        <Route path="/fonts" element={<DebugRoute><Suspense fallback={<LoadingSpinner />}><FontShowcase /></Suspense></DebugRoute>} />
        <Route path="/breadcrumbs" element={<DebugRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><BreadcrumbDemo /></Suspense></MainLayout></DebugRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NetworkStatusProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </NetworkStatusProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;