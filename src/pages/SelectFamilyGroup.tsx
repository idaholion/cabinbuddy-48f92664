import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SelectFamilyGroup = () => {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState("");
  const [familyGroups, setFamilyGroups] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load family groups from localStorage
  useEffect(() => {
    const savedGroups = localStorage.getItem('familyGroupsList');
    if (savedGroups) {
      const groups = JSON.parse(savedGroups);
      setFamilyGroups(groups);
    } else {
      // Fallback to sample data if no saved groups
      setFamilyGroups([
        "Smith Family",
        "Johnson Family", 
        "Williams Family",
        "Brown Family",
        "Davis Family",
        "Miller Family"
      ]);
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png')",
      }}
    >
      <div className="min-h-screen p-4">
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
          <div className="text-center mb-2">
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">
              Select Family Group
            </h1>
            <p className="text-xl text-primary">
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
              {familyGroups.length > 0 ? (
                <>
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
                </>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    No family groups have been set up yet.
                  </p>
                  <Button asChild>
                    <Link to="/family-setup">
                      Go to Family Setup to Create Groups
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