import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <h1 className="text-4xl font-bold text-red-500 mb-2 flex items-center">
            <Calendar className="h-10 w-10 mr-3" />
            Cabin Calendar
          </h1>
          <p className="text-lg text-red-400">View and manage cabin reservations and availability</p>
        </div>

        <div className="flex gap-6">
          {/* Rotation Order Sidebar */}
          {currentRotationOrder.length > 0 && (
            <div className="w-80">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {currentYear} Rotation Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentRotationOrder.map((familyGroup, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="font-semibold text-sm w-6">{index + 1}.</span>
                        <span className="text-sm">{familyGroup}</span>
                      </div>
                    ))}
                  </div>
                  {rotationData && (
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      <p>Based on {rotationData.rotation_year} rotation</p>
                      <p>Rotation: {rotationData.first_last_option === "first" ? "First to last" : "Last to first"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Calendar */}
          <div className="flex-1">
            <PropertyCalendar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CabinCalendar;