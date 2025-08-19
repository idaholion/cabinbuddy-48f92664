import { useState, useEffect } from 'react';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Building, Shield, Trash2, UserPlus, DollarSign } from 'lucide-react';
import { OrganizationDetail } from '@/components/OrganizationDetail';
import { SupervisorManagement } from '@/components/SupervisorManagement';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import { CreateTestOrganizationDialog } from '@/components/CreateTestOrganizationDialog';
import { DataManagementControls } from '@/components/DataManagementControls';
import { DefaultFeatureManagement } from '@/components/DefaultFeatureManagement';

import { SupervisorFamilyGroupsTab } from '@/components/SupervisorFamilyGroupsTab';
import { SupervisorFinancialTab } from '@/components/SupervisorFinancialTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [selectedOrgForTabs, setSelectedOrgForTabs] = useState<string>('');
  const [activeTab, setActiveTab] = useState('organizations');

  // Check URL parameters for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

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
          <p className="text-muted-foreground text-base">Manage organizations and supervisors</p>
        </div>
        <div className="flex justify-end items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <CreateTestOrganizationDialog onOrganizationCreated={refetchOrganizations} />
            <CreateOrganizationDialog onOrganizationCreated={refetchOrganizations} />
            <Badge variant="secondary" className="text-base">
              <Shield className="w-4 h-4 mr-2" />
              Supervisor Access
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Total Organizations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Active Supervisors</CardTitle>
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
              <CardTitle className="text-base font-medium">Organizations with Alt. Supervisors</CardTitle>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="organizations" className="text-base">Organizations</TabsTrigger>
            <TabsTrigger value="family-groups" className="text-base">Family Groups</TabsTrigger>
            <TabsTrigger value="financial-records" className="text-base">Financial Records</TabsTrigger>
            <TabsTrigger value="features" className="text-base">Default Features</TabsTrigger>
            <TabsTrigger value="supervisors" className="text-base">Supervisors</TabsTrigger>
            <TabsTrigger value="data-management" className="text-base">Data Management</TabsTrigger>
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
                  className="pl-10 text-base placeholder:text-base"
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
                        <CardDescription className="font-mono text-base">
                          Code: {org.code}
                        </CardDescription>
                      </div>
                      {org.alternate_supervisor_email && (
                        <Badge variant="outline" className="text-base">
                          Alt. Supervisor
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {org.admin_name && (
                      <div className="text-base">
                        <span className="font-medium">Admin:</span> {org.admin_name}
                      </div>
                    )}
                    {org.admin_email && (
                      <div className="text-base text-muted-foreground">
                        {org.admin_email}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedOrganization(org.id)}
                        className="flex-1 text-base hover:scale-105 hover:shadow-md transition-all duration-200"
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteOrganizationData(org.id)}
                        className="text-base hover:scale-110 hover:shadow-lg hover:shadow-destructive/30 transition-all duration-200"
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
                  <p className="text-muted-foreground text-center text-base">
                    {searchTerm ? 'Try adjusting your search terms.' : 'No organizations have been created yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="family-groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Groups Management
                </CardTitle>
                <CardDescription className="text-base">
                  Manage family groups for a specific organization. Select an organization to view and edit its family groups.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-sm">
                    <Select value={selectedOrgForTabs} onValueChange={setSelectedOrgForTabs}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id} className="text-base">
                            {org.name} ({org.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedOrgForTabs && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <SupervisorFamilyGroupsTab organizationId={selectedOrgForTabs} />
                  </div>
                )}
                {!selectedOrgForTabs && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base">Select an organization above to manage its family groups</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial-records" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Records Management
                </CardTitle>
                <CardDescription className="text-base">
                  Manage financial records and expenses for a specific organization. Select an organization to view and manage its financial data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-sm">
                    <Select value={selectedOrgForTabs} onValueChange={setSelectedOrgForTabs}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id} className="text-base">
                            {org.name} ({org.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedOrgForTabs && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <SupervisorFinancialTab organizationId={selectedOrgForTabs} />
                  </div>
                )}
                {!selectedOrgForTabs && (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base">Select an organization above to manage its financial records</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <DefaultFeatureManagement />
          </TabsContent>

          <TabsContent value="supervisors">
            <SupervisorManagement supervisors={supervisors} />
          </TabsContent>

          <TabsContent value="data-management">
            <DataManagementControls 
              organizations={organizations} 
              onDataChanged={refetchOrganizations}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};