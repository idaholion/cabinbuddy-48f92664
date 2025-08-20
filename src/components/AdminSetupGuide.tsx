import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Users, Building2, UserPlus } from 'lucide-react';

export const AdminSetupGuide = () => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Admin Setup Guide</h1>
        <p className="text-muted-foreground">
          How to set up your organization so group leads can log in and claim their profiles
        </p>
      </div>

      <div className="grid gap-6">
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Step 1: Create Organization
              <Badge variant="outline">Administrator</Badge>
            </CardTitle>
            <CardDescription>
              First, create your organization with basic contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Create the organization</p>
                <p className="text-sm text-muted-foreground">
                  Use the supervisor dashboard to create a new organization with a unique code
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Step 2: Create Family Groups
              <Badge variant="outline">Administrator</Badge>
            </CardTitle>
            <CardDescription>
              Add family groups with group lead names (email optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Add group lead name</p>
                <p className="text-sm text-muted-foreground">
                  Enter the group lead's name as they would use when logging in (e.g., "John Smith")
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Email is optional</p>
                <p className="text-sm text-muted-foreground">
                  You don't need to provide an email address - the name-based claiming system will handle the connection
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Add additional members</p>
                <p className="text-sm text-muted-foreground">
                  Optionally add other family members who can also claim profiles and manage the group
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Step 3: Group Lead Claims Profile
              <Badge variant="secondary">Group Lead</Badge>
            </CardTitle>
            <CardDescription>
              How group leads connect to their family group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Group lead creates account</p>
                <p className="text-sm text-muted-foreground">
                  The group lead signs up using any email address and creates an account
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Join organization with code</p>
                <p className="text-sm text-muted-foreground">
                  They use the organization code you provided to join the organization
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Claim their profile</p>
                <p className="text-sm text-muted-foreground">
                  On the Host Profile page, they click "Claim Profile" and search for their name to link to their group
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Step 4: Profile Management
              <Badge variant="secondary">Group Lead</Badge>
            </CardTitle>
            <CardDescription>
              What group leads can do after claiming their profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Update contact information</p>
                <p className="text-sm text-muted-foreground">
                  Add/update email, phone, and other profile details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Manage family group</p>
                <p className="text-sm text-muted-foreground">
                  Add family members, set permissions, and manage group settings
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Make reservations</p>
                <p className="text-sm text-muted-foreground">
                  Book time periods and manage their family's cabin usage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Benefits of This System</CardTitle>
          </CardHeader>
          <CardContent className="text-green-700 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>No need to collect email addresses upfront</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Intelligent name matching handles variations (John vs Jonathan)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Secure - each profile can only be claimed once</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Group leads can immediately start managing their group</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};