import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCalendar } from "@/components/PropertyCalendar";

const CabinCalendar = () => {
  return (
    <div className="min-h-screen bg-gradient-forest p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/dashboard">← Back to Dashboard</Link>
          </Button>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2 flex items-center">
            <Calendar className="h-10 w-10 mr-3" />
            Cabin Calendar
          </h1>
          <p className="text-lg text-primary-foreground/80">View and manage cabin reservations and availability</p>
        </div>

        <PropertyCalendar />
      </div>
    </div>
  );
};

export default CabinCalendar;