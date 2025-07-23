
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./pages/Intro";
import Index from "./pages/Index";
import Login from "./pages/Login";
import FamilySetup from "./pages/FamilySetup";
import FamilyGroupSetup from "./pages/FamilyGroupSetup";
import FinancialSetup from "./pages/FinancialSetup";
import ReservationSetup from "./pages/ReservationSetup";
import CabinCalendar from "./pages/CabinCalendar";
import CheckIn from "./pages/CheckIn";
import DailyCheckIn from "./pages/DailyCheckIn";
import AddReceipt from "./pages/AddReceipt";
import ShoppingList from "./pages/ShoppingList";
import CabinRules from "./pages/CabinRules";
import Documents from "./pages/Documents";
import CheckoutList from "./pages/CheckoutList";
import CheckoutFinal from "./pages/CheckoutFinal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/home" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/family-setup" element={<FamilySetup />} />
          <Route path="/family-group-setup" element={<FamilyGroupSetup />} />
          <Route path="/financial-setup" element={<FinancialSetup />} />
          <Route path="/reservation-setup" element={<ReservationSetup />} />
          <Route path="/calendar" element={<CabinCalendar />} />
          <Route path="/check-in" element={<CheckIn />} />
          <Route path="/daily-check-in" element={<DailyCheckIn />} />
          <Route path="/add-receipt" element={<AddReceipt />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/cabin-rules" element={<CabinRules />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/checkout-list" element={<CheckoutList />} />
          <Route path="/checkout-final" element={<CheckoutFinal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
