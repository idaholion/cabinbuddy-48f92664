import { useState } from 'react';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Building, Shield, Trash2, UserPlus } from 'lucide-react';
import { OrganizationDetail } from '@/components/OrganizationDetail';
import { SupervisorManagement } from '@/components/SupervisorManagement';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import { CreateTestOrganizationDialog } from '@/components/CreateTestOrganizationDialog';

export const SupervisorDashboard = () => {
  const { 
    isSupervisor, 
    loading, 
    organizations, 
    supervisors,
    deleteOrganizationData,
    updateAlternateSupervisor,
    refetchOrganizations,
    refetchSupervisors
  } = useSupervisor();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isSupervisor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have supervisor privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedOrganization) {
    const organization = organizations.find(org => org.id === selectedOrganization);
    if (organization) {
      return (
        <OrganizationDetail
          organization={organization}
          onBack={() => setSelectedOrganization(null)}
          onDelete={deleteOrganizationData}
          onUpdateAlternateSupervisor={updateAlternateSupervisor}
        />
      );
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg">Cabin Buddy Supervisor</h1>
          <p className="text-muted-foreground">Manage organizations and supervisors</p>
        </div>
        <div className="flex justify-end items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <CreateTestOrganizationDialog onOrganizationCreated={refetchOrganizations} />
            <CreateOrganizationDialog onOrganizationCreated={refetchOrganizations} />
            <Badge variant="secondary" className="text-sm">
              <Shield className="w-4 h-4 mr-2" />
              Supervisor Access
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Supervisors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {supervisors.filter(s => s.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations with Alt. Supervisors</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations.filter(org => org.alternate_supervisor_email).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
          </TabsList>

          <TabsContent value="organizations" className="space-y-6">
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Organizations Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrganizations.map((org) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <CardDescription className="font-mono text-sm">
                          Code: {org.code}
                        </CardDescription>
                      </div>
                      {org.alternate_supervisor_email && (
                        <Badge variant="outline" className="text-xs">
                          Alt. Supervisor
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {org.admin_name && (
                      <div className="text-sm">
                        <span className="font-medium">Admin:</span> {org.admin_name}
                      </div>
                    )}
                    {org.admin_email && (
                      <div className="text-sm text-muted-foreground">
                        {org.admin_email}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedOrganization(org.id)}
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteOrganizationData(org.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredOrganizations.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No organizations found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm ? 'Try adjusting your search terms.' : 'No organizations have been created yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="supervisors">
            <SupervisorManagement supervisors={supervisors} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};