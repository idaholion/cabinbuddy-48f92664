import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { FamilyGroups } from "@/components/FamilyGroups";
const FamilySetup = () => {
  return <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
    backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
  }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/dashboard">← Back to Dashboard</Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-orange-400 text-center">Organization Setup</h1>
          <p className="text-orange-500 text-3xl text-center">Setting up your family organization and cabin access</p>
        </div>

        {/* Setup Family Organization Form */}
        <Card className="bg-card/95 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Set up Family Organization</CardTitle>
            <CardDescription className="text-center">Name your family organization and designate an administrator and treasurer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Family Organization Name</Label>
              <Input id="orgName" placeholder="Enter organization name" />
            </div>

            {/* Administrator Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Organization Administrator</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Name</Label>
                  <Input id="adminName" placeholder="Administrator's full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email Address</Label>
                  <Input id="adminEmail" type="email" placeholder="administrator@example.com" />
                </div>
              </div>
            </div>

            {/* Treasurer Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Organization Treasurer</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="treasurerName">Name</Label>
                  <Input id="treasurerName" placeholder="Treasurer's full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treasurerEmail">Email Address</Label>
                  <Input id="treasurerEmail" type="email" placeholder="treasurer@example.com" />
                </div>
              </div>
            </div>

            <Button className="w-full md:w-auto">Save Organization Setup</Button>
          </CardContent>
        </Card>

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
    </div>;
};
export default FamilySetup;