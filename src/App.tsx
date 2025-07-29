
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Intro from "./pages/Intro";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Setup from "./pages/Setup";
import FamilySetup from "./pages/FamilySetup";
import FamilyGroupSetup from "./pages/FamilyGroupSetup";
import SelectFamilyGroup from "./pages/SelectFamilyGroup";
import FinancialSetup from "./pages/FinancialSetup";
import FinancialSetupPage from "./pages/FinancialSetupPage";
import ReservationSetup from "./pages/ReservationSetup";
import CabinCalendar from "./pages/CabinCalendar";
import CheckIn from "./pages/CheckIn";
import DailyCheckIn from "./pages/DailyCheckIn";
import AddReceipt from "./pages/AddReceipt";
import ShoppingList from "./pages/ShoppingList";
import CabinRules from "./pages/CabinRules";
import Documents from "./pages/Documents";
import CabinSeasonalDocs from "./pages/CabinSeasonalDocs";
import CheckoutList from "./pages/CheckoutList";
import CheckoutFinal from "./pages/CheckoutFinal";
import PhotoSharing from "./pages/PhotoSharing";
import FontShowcase from "./pages/FontShowcase";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { SupervisorDashboard } from "./pages/SupervisorDashboard";
import { SupervisorRoute } from "./components/SupervisorRoute";
import SupervisorOrganizationFamilyGroups from "./pages/SupervisorOrganizationFamilyGroups";
import SupervisorOrganizationFinancial from "./pages/SupervisorOrganizationFinancial";
import SupervisorOrganizationReservation from "./pages/SupervisorOrganizationReservation";
import { SelectOrganization } from "./pages/SelectOrganization";
import { SidebarDemo } from "./components/SidebarExample";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Intro />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/select-organization" element={<ProtectedRoute><SelectOrganization /></ProtectedRoute>} />
            <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
          <Route path="/family-setup" element={<ProtectedRoute><FamilySetup /></ProtectedRoute>} />
          <Route path="/select-family-group" element={<ProtectedRoute><SelectFamilyGroup /></ProtectedRoute>} />
          <Route path="/family-group-setup" element={<ProtectedRoute><FamilyGroupSetup /></ProtectedRoute>} />
          <Route path="/finance-reports" element={<ProtectedRoute><FinancialSetup /></ProtectedRoute>} />
          <Route path="/financial-setup" element={<ProtectedRoute><FinancialSetupPage /></ProtectedRoute>} />
          <Route path="/reservation-setup" element={<ProtectedRoute><ReservationSetup /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CabinCalendar /></ProtectedRoute>} />
          <Route path="/check-in" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
          <Route path="/daily-check-in" element={<ProtectedRoute><DailyCheckIn /></ProtectedRoute>} />
          <Route path="/add-receipt" element={<ProtectedRoute><AddReceipt /></ProtectedRoute>} />
          <Route path="/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
          <Route path="/cabin-rules" element={<ProtectedRoute><CabinRules /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/cabin-seasonal-docs" element={<ProtectedRoute><CabinSeasonalDocs /></ProtectedRoute>} />
          <Route path="/checkout-list" element={<ProtectedRoute><CheckoutList /></ProtectedRoute>} />
          <Route path="/checkout-final" element={<ProtectedRoute><CheckoutFinal /></ProtectedRoute>} />
          <Route path="/photos" element={<ProtectedRoute><PhotoSharing /></ProtectedRoute>} />
          <Route path="/supervisor" element={<SupervisorRoute><SupervisorDashboard /></SupervisorRoute>} />
          <Route path="/supervisor/organization/:organizationId/family-groups" element={<SupervisorRoute><SupervisorOrganizationFamilyGroups /></SupervisorRoute>} />
          <Route path="/supervisor/organization/:organizationId/financial" element={<SupervisorRoute><SupervisorOrganizationFinancial /></SupervisorRoute>} />
           <Route path="/supervisor/organization/:organizationId/reservation" element={<SupervisorRoute><SupervisorOrganizationReservation /></SupervisorRoute>} />
           <Route path="/sidebar-demo" element={<SidebarDemo />} />
           <Route path="/fonts" element={<FontShowcase />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
