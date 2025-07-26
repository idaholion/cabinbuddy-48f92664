
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Settings, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { FamilyGroups } from "@/components/FamilyGroups";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
const FamilySetup = () => {
  const { toast } = useToast();
  
  // Generate a unique 6-character alphanumeric organization code
  const generateOrgCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [organizationCode] = useState(generateOrgCode());

  const copyToClipboard = () => {
    navigator.clipboard.writeText(organizationCode);
    toast({
      title: "Organization code copied!",
      description: "The organization code has been copied to your clipboard.",
    });
  };

  return <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
    backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
  }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-red-500 text-center" style={{ fontFamily: 'Brush Script MT, cursive' }}>Organization Setup</h1>
          <p className="text-red-500 text-3xl text-center" style={{ fontFamily: 'Brush Script MT, cursive' }}>Setting up your Family Organization and Family Groups list</p>
        </div>

        {/* Combined Family Organization and Groups Setup */}
        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <div className="flex justify-end">
              <Button className="">Save Organization Setup</Button>
            </div>
            <CardTitle className="text-2xl text-center">Family Organization & Groups Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 py-4">
            {/* Organization Setup Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center border-b pb-2">Set up Family Organization</h2>
              
              {/* Organization Name */}
              <div className="space-y-1">
                <Label htmlFor="orgName" className="text-xl font-semibold text-center block">Family Organization Name</Label>
                <Input id="orgName" placeholder="Enter organization name" />
              </div>

              {/* Organization Code */}
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-center block">Organization Code</Label>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-muted px-4 py-2 rounded-md border-2 border-dashed border-border">
                    <span className="text-2xl font-bold tracking-wider text-primary">{organizationCode}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Share this code with new members to help them join your organization
                </p>
              </div>

              {/* Administrator Section */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-center">Administrator</h3>
                <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                  <div className="space-y-1">
                    <Label htmlFor="adminName">Name</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adminPhone">Phone Number</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adminEmail">Email Address</Label>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input id="adminName" placeholder="Administrator's full name" />
                  <Input id="adminPhone" type="tel" placeholder="(555) 123-4567" />
                  <Input id="adminEmail" type="email" placeholder="administrator@example.com" />
                </div>
              </div>

              {/* Treasurer Section */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-center">Treasurer</h3>
                <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                  <div className="space-y-1">
                    <Label htmlFor="treasurerName">Name</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="treasurerPhone">Phone Number</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="treasurerEmail">Email Address</Label>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input id="treasurerName" placeholder="Treasurer's full name" />
                  <Input id="treasurerPhone" type="tel" placeholder="(555) 123-4567" />
                  <Input id="treasurerEmail" type="email" placeholder="treasurer@example.com" />
                </div>
              </div>

              {/* Calendar Keeper Section */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-center">Calendar Keeper</h3>
                <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                  <div className="space-y-1">
                    <Label htmlFor="calendarKeeperName">Name</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calendarKeeperPhone">Phone Number</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calendarKeeperEmail">Email Address</Label>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input id="calendarKeeperName" placeholder="Calendar Keeper's full name" />
                  <Input id="calendarKeeperPhone" type="tel" placeholder="(555) 123-4567" />
                  <Input id="calendarKeeperEmail" type="email" placeholder="calendarkeeper@example.com" />
                </div>
              </div>
            </div>

            {/* Family Groups Section */}
            <div className="space-y-4">
              <div className="relative">
                <h2 className="text-xl font-semibold text-center border-b pb-2">List of Family Groups</h2>
                <Button className="absolute top-0 right-0" asChild>
                  <Link to="/family-group-setup">Set up Family Groups</Link>
                </Button>
              </div>
              
              {[...Array(6)].map((_, index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`familyGroup${index + 1}`} className="text-lg font-semibold">Family Group {index + 1}</Label>
                  <Input id={`familyGroup${index + 1}`} placeholder={`Enter Family Group ${index + 1} name`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>;
};
export default FamilySetup;
