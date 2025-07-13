import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings } from "lucide-react";

export const FinancialSetupSheet = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Set up Financials
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Set up Financials</SheetTitle>
          <SheetDescription>
            Configure your cabin's financial settings, pricing, and payment methods.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4">
          <p>Financial setup form will go here.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};