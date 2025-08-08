import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { useEnhancedErrorTracking } from '@/hooks/useEnhancedErrorTracking';
import { useLaunchAnalytics, usePageTracking } from '@/hooks/useLaunchAnalytics';

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
import { SelectOrganization } from "./pages/SelectOrganization";
import { Onboarding } from "./pages/Onboarding";

// Lazy load setup pages (used less frequently)
const FamilySetup = React.lazy(() => import("./pages/FamilySetup"));
const FamilyGroupSetup = React.lazy(() => import("./pages/FamilyGroupSetup"));
const HostProfile = React.lazy(() => import("./pages/HostProfile"));
const FinancialDashboard = React.lazy(() => import("./pages/FinancialDashboard"));
const ReservationSetup = React.lazy(() => import("./pages/ReservationSetup"));

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

// Lazy load admin/supervisor pages
const SupervisorDashboard = React.lazy(() => import("./pages/SupervisorDashboard").then(module => ({ default: module.SupervisorDashboard })));
const SupervisorOrganizationFamilyGroups = React.lazy(() => import("./pages/SupervisorOrganizationFamilyGroups"));
const SupervisorOrganizationFinancial = React.lazy(() => import("./pages/SupervisorOrganizationFinancial"));
const SupervisorOrganizationReservation = React.lazy(() => import("./pages/SupervisorOrganizationReservation"));


// Lazy load utility pages
const FontShowcase = React.lazy(() => import("./pages/FontShowcase"));
const BreadcrumbDemo = React.lazy(() => import("./pages/BreadcrumbDemo"));

import { SupervisorRoute } from "./components/SupervisorRoute";

import { AdminTreasurerRoute } from "./components/AdminTreasurerRoute";

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
        <Route path="/" element={<Intro />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/home" element={<ProtectedRoute><MainLayout><Index /></MainLayout></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/select-organization" element={<ProtectedRoute><MainLayout><SelectOrganization /></MainLayout></ProtectedRoute>} />
        <Route path="/setup" element={<ProtectedRoute><MainLayout><Setup /></MainLayout></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><MainLayout><CabinCalendar /></MainLayout></ProtectedRoute>} />
        <Route path="/check-in" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CheckIn /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/daily-check-in" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><DailyCheckIn /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/checkout-list" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CheckoutList /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/checkout-final" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CheckoutFinal /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/shopping-list" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><ShoppingList /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/add-receipt" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><AddReceipt /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/stay-history" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><StayHistory /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/cabin-rules" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CabinRules /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><Documents /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/cabin-seasonal-docs" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><CabinSeasonalDocs /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/photos" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><PhotoSharing /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/reservation-setup" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><ReservationSetup /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/data-backup" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><DataBackup /></Suspense></MainLayout></ProtectedRoute>} />
        
        <Route path="/family-setup" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><FamilySetup /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/select-family-group" element={<ProtectedRoute><MainLayout><SelectFamilyGroup /></MainLayout></ProtectedRoute>} />
        <Route path="/family-group-setup" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner />}><FamilyGroupSetup /></Suspense></ProtectedRoute>} />
        <Route path="/host-profile" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><HostProfile /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/finance-reports" element={<AdminTreasurerRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><FinancialDashboard /></Suspense></MainLayout></AdminTreasurerRoute>} />
        <Route path="/financial-setup" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/admin-treasurer" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/admin/treasurer" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/messaging" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><Messaging /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/payment-tracking" element={<Navigate to="/finance-reports" replace />} />
        <Route path="/demo" element={<ProtectedRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><Demo /></Suspense></MainLayout></ProtectedRoute>} />
        <Route path="/supervisor" element={<SupervisorRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><SupervisorDashboard /></Suspense></MainLayout></SupervisorRoute>} />
        <Route path="/supervisor/organization/:organizationId/family-groups" element={<SupervisorRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><SupervisorOrganizationFamilyGroups /></Suspense></MainLayout></SupervisorRoute>} />
        <Route path="/supervisor/organization/:organizationId/financial" element={<SupervisorRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><SupervisorOrganizationFinancial /></Suspense></MainLayout></SupervisorRoute>} />
        <Route path="/supervisor/organization/:organizationId/reservation" element={<SupervisorRoute><MainLayout><Suspense fallback={<LoadingSpinner />}><SupervisorOrganizationReservation /></Suspense></MainLayout></SupervisorRoute>} />
        
        <Route path="/fonts" element={<Suspense fallback={<LoadingSpinner />}><FontShowcase /></Suspense>} />
        <Route path="/breadcrumbs" element={<MainLayout><Suspense fallback={<LoadingSpinner />}><BreadcrumbDemo /></Suspense></MainLayout>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;