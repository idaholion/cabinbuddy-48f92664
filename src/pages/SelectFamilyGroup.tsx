import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SelectFamilyGroup = () => {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState("");
  const navigate = useNavigate();

  // Sample family groups - in a real app, this would come from the family setup data
  const familyGroups = [
    "Smith Family",
    "Johnson Family", 
    "Williams Family",
    "Brown Family",
    "Davis Family",
    "Miller Family"
  ];

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/src/assets/cabin-hero.jpg')",
      }}
    >
      <div className="min-h-screen bg-black/50 p-4">
        <div className="container mx-auto max-w-2xl">
          {/* Back button */}
          <div className="mb-6 pt-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Page title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Select Family Group
            </h1>
            <p className="text-xl text-white/90">
              Choose the family group you are a member of
            </p>
          </div>

          {/* Selection card */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Family Group Selection</CardTitle>
              <CardDescription>
                Select the family group you are a member of from the list below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Family Group</label>
                <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your family group" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFamilyGroup && (
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <Link to="/family-group-setup">
                      Go to Family Group Setup for {selectedFamilyGroup}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SelectFamilyGroup;