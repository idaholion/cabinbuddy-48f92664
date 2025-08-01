import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Clock, Users, Trash2, Wifi, Car, Home, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const CabinRules = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Cabin Rules & Policies</h1>
          <p className="text-2xl text-primary text-center font-medium">Please review and follow all cabin guidelines</p>
        </div>

        <Card className="bg-card/95 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              General Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-1">1</Badge>
                <p className="text-lg">No smoking inside the cabin. Smoking is permitted outside only.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-1">2</Badge>
                <p className="text-lg">No pets allowed without prior approval from the administrator.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-1">3</Badge>
                <p className="text-lg">Respect quiet hours from 10:00 PM to 8:00 AM.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-1">4</Badge>
                <p className="text-lg">Maximum occupancy is strictly enforced for safety and insurance reasons.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Check-in & Check-out
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold">Check-in: 4:00 PM</h4>
                <p className="text-sm text-muted-foreground">Early check-in may be available upon request</p>
              </div>
              <div>
                <h4 className="font-semibold">Check-out: 11:00 AM</h4>
                <p className="text-sm text-muted-foreground">Late check-out may incur additional fees</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>All guests must be registered during booking.</p>
              <p>Unregistered guests may result in additional charges.</p>
              <p>Day visitors must be approved in advance.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Property Care
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Please treat the cabin as you would your own home.</p>
              <p>Report any damages immediately to avoid charges.</p>
              <p>Replace any items you break or consume.</p>
              <p>Keep the cabin clean and tidy during your stay.</p>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Cleaning & Trash
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Clean up after yourself during your stay.</p>
              <p>Take out trash before departure.</p>
              <p>Load and run the dishwasher before leaving.</p>
              <p>Strip beds and place linens in laundry area.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Parking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Designated parking spots only.</p>
              <p>No street parking allowed.</p>
              <p>Park responsibly to allow emergency vehicle access.</p>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Amenities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>WiFi password is posted in the main living area.</p>
              <p>Use hot tub responsibly - shower before use.</p>
              <p>Turn off all lights and appliances when leaving.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/95 mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Emergency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <h4 className="font-semibold">Emergency Services</h4>
                <p className="text-2xl font-bold text-red-600">911</p>
              </div>
              <div>
                <h4 className="font-semibold">Property Manager</h4>
                <p className="text-lg">(555) 123-4567</p>
              </div>
              <div>
                <h4 className="font-semibold">Local Hospital</h4>
                <p className="text-lg">(555) 987-6543</p>
              </div>
            </div>
            <Separator />
            <div className="text-center">
              <h4 className="font-semibold mb-2">Emergency Procedures</h4>
              <p>Fire extinguisher and first aid kit are located in the kitchen.</p>
              <p>Emergency evacuation plan is posted near the main exit.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle className="text-xl text-center">Violation Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-center">
              Violations of these rules may result in immediate removal from the property
              and forfeiture of all fees paid, as well as additional cleaning or damage charges.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              By staying at this property, you agree to abide by all rules and policies listed above.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CabinRules;