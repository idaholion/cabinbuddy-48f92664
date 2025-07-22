import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCalendar } from "@/components/PropertyCalendar";

const CabinCalendar = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
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