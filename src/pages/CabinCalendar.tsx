import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCalendar } from "@/components/PropertyCalendar";
import { useRotationOrder } from "@/hooks/useRotationOrder";

const CabinCalendar = () => {
  const { getRotationForYear, rotationData } = useRotationOrder();
  const currentYear = new Date().getFullYear();
  const currentRotationOrder = getRotationForYear(currentYear);

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-red-500 mb-2 flex items-center">
                <Calendar className="h-10 w-10 mr-3" />
                Cabin Calendar
              </h1>
              <p className="text-lg text-red-400">View and manage cabin reservations and availability</p>
            </div>
            
            {/* Rotation Order Dropdown */}
            {currentRotationOrder.length > 0 && (
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-red-400" />
                <Select>
                  <SelectTrigger className="w-48 bg-background/90 backdrop-blur-sm border-red-200">
                    <SelectValue placeholder={`${currentYear} Rotation Order`} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    <div className="p-3">
                      <div className="font-medium text-sm mb-2">{currentYear} Rotation Order</div>
                      <div className="space-y-1">
                        {currentRotationOrder.map((familyGroup, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="font-semibold w-6">{index + 1}.</span>
                            <span>{familyGroup}</span>
                          </div>
                        ))}
                      </div>
                      {rotationData && (
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                          <p>Based on {rotationData.rotation_year} rotation</p>
                          <p>Rotation: {rotationData.first_last_option === "first" ? "First to last" : "Last to first"}</p>
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <PropertyCalendar />
      </div>
    </div>
  );
};

export default CabinCalendar;