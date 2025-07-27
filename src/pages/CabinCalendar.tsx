import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, RotateCcw, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCalendar } from "@/components/PropertyCalendar";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useState } from "react";

const CabinCalendar = () => {
  const { getRotationForYear, rotationData } = useRotationOrder();
  const { reservationSettings } = useReservationSettings();
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  
  // Calculate the rotation year based on current calendar month and start month
  const getRotationYear = () => {
    if (!rotationData || !reservationSettings?.start_month) {
      return new Date().getFullYear();
    }
    
    const calendarYear = currentCalendarMonth.getFullYear();
    const calendarMonthIndex = currentCalendarMonth.getMonth();
    const baseRotationYear = rotationData.rotation_year;
    const startMonth = reservationSettings.start_month;
    
    // Convert month name to number (0-11)
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const startMonthIndex = monthNames.indexOf(startMonth);
    
    // Calculate which rotation year this calendar month/year represents
    let rotationYear = baseRotationYear;
    
    // If we're before the start month in the current calendar year, use previous rotation year
    if (calendarMonthIndex < startMonthIndex) {
      rotationYear = baseRotationYear;
    } else {
      // If we're at or after the start month, use next rotation year
      rotationYear = baseRotationYear + 1;
    }
    
    // Adjust for years after the base year
    if (calendarYear > baseRotationYear) {
      const yearDiff = calendarYear - baseRotationYear;
      if (calendarMonthIndex >= startMonthIndex) {
        rotationYear = baseRotationYear + yearDiff + 1;
      } else {
        rotationYear = baseRotationYear + yearDiff;
      }
    }
    
    return rotationYear;
  };
  
  const rotationYear = getRotationYear();
  const currentRotationOrder = rotationData ? getRotationForYear(rotationYear) : [];
  
  // Placeholder data for selection indicators
  const getSelectionIndicators = (familyGroup: string) => {
    // TODO: Replace with actual data from database
    const mockSelections = {
      primary: Math.random() > 0.6, // 40% chance of having primary selection
      secondary: Math.random() > 0.7 // 30% chance of having secondary selection
    };
    return mockSelections;
  };

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
                  <SelectTrigger className="w-56 bg-background/90 backdrop-blur-sm border-red-200">
                    <SelectValue placeholder={`${rotationYear} Rotation Order`} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    <div className="p-3">
                      <div className="font-medium text-sm mb-2">{rotationYear} Rotation Order</div>
                      <div className="space-y-1">
                        {currentRotationOrder.map((familyGroup, index) => {
                          const selections = getSelectionIndicators(familyGroup);
                          return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span className="font-semibold w-6">{index + 1}.</span>
                              <span className="flex-1">{familyGroup}</span>
                              <div className="flex items-center gap-1">
                                {selections.primary && (
                                  <div title="Primary selection made">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  </div>
                                )}
                                {selections.secondary && (
                                  <div title="Secondary selection made">
                                    <Clock className="h-3 w-3 text-blue-500" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {rotationData && (
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                          <p>Based on {rotationData.rotation_year} rotation</p>
                          <p>Rotation: {rotationData.first_last_option === "first" ? "First to last" : "Last to first"}</p>
                          {reservationSettings?.start_month && (
                            <p>Rotation year starts in {reservationSettings.start_month}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <PropertyCalendar onMonthChange={setCurrentCalendarMonth} />
      </div>
    </div>
  );
};

export default CabinCalendar;