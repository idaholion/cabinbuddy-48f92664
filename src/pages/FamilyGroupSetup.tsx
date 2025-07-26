import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const FamilyGroupSetup = () => {
  const [familyGroups, setFamilyGroups] = useState<string[]>([]);

  useEffect(() => {
    const savedSetup = localStorage.getItem('organizationSetup');
    if (savedSetup) {
      const setup = JSON.parse(savedSetup);
      if (setup.familyGroups) {
        // Filter out empty family group names
        const validFamilyGroups = setup.familyGroups.filter((group: string) => group.trim() !== '');
        setFamilyGroups(validFamilyGroups);
      }
    }
  }, []);
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/family-setup">← Back to Family Setup</Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-orange-400 text-center">Family Group Setup</h1>
          <p className="text-orange-500 text-3xl text-center">Setting up your Family Groups</p>
        </div>

        {/* Setup Family Groups Form */}
        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <Button className="absolute top-6 right-6">Save Family Group Setup</Button>
            <Button className="absolute top-16 right-6" asChild>
              <Link to="/financial-setup">Go to Financial Setup</Link>
            </Button>
            <CardTitle className="text-2xl text-center">Set up Family Groups</CardTitle>
            <CardDescription className="text-center">Create a family group with lead and host members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-2">
            {/* Family Group Name */}
            <div className="space-y-1">
              <Label htmlFor="groupName" className="text-xl font-semibold text-center block">Family Group Name</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a family group" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {familyGroups.length > 0 ? (
                    familyGroups.map((group, index) => (
                      <SelectItem key={index} value={group.toLowerCase().replace(/\s+/g, '-')}>
                        {group}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-groups" disabled>
                      No family groups found - Please set them up in Family Setup first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Family Group Lead Section */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-center">Family Group Lead</h3>
              <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                <div className="space-y-1">
                  <Label htmlFor="leadName">Name</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="leadPhone">Phone Number</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="leadEmail">Email Address</Label>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Input id="leadName" placeholder="Family Group Lead's full name" />
                <Input id="leadPhone" type="tel" placeholder="(555) 123-4567" />
                <Input id="leadEmail" type="email" placeholder="lead@example.com" />
              </div>
            </div>

            {/* Host Members Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-center">Additional Host Members</h3>
              {[...Array(3)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                    <div className="space-y-1">
                      <Label htmlFor={`hostName${index + 1}`}>Name</Label>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`hostPhone${index + 1}`}>Phone Number</Label>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`hostEmail${index + 1}`}>Email Address</Label>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input id={`hostName${index + 1}`} placeholder={`Host Member ${index + 1} full name`} />
                    <Input id={`hostPhone${index + 1}`} type="tel" placeholder="(555) 123-4567" />
                    <Input id={`hostEmail${index + 1}`} type="email" placeholder={`hostmember${index + 1}@example.com`} />
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-2">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Host Member
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyGroupSetup;