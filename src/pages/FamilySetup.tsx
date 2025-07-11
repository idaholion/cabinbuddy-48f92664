import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { FamilyGroups } from "@/components/FamilyGroups";

const FamilySetup = () => {
  return (
    <div className="min-h-screen bg-gradient-forest p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/dashboard">← Back to Dashboard</Link>
          </Button>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">Family Organization Setup</h1>
          <p className="text-lg text-primary-foreground/80">Manage your family groups and cabin access</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Family Groups
              </CardTitle>
              <CardDescription>View and manage existing family groups</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Manage Groups</Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Add New Group
              </CardTitle>
              <CardDescription>Create a new family group for cabin access</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Create Group</Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Group Settings
              </CardTitle>
              <CardDescription>Configure permissions and access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">Settings</Button>
            </CardContent>
          </Card>
        </div>

        <FamilyGroups />
      </div>
    </div>
  );
};

export default FamilySetup;