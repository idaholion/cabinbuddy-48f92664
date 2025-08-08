import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Users, Receipt, Calendar, Settings, Trash2, UserPlus, Mail, Phone, FileText, DollarSign, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  code: string;
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
  treasurer_name?: string;
  treasurer_email?: string;
  treasurer_phone?: string;
  calendar_keeper_name?: string;
  calendar_keeper_email?: string;
  calendar_keeper_phone?: string;
  alternate_supervisor_email?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationDetailProps {
  organization: Organization;
  onBack: () => void;
  onDelete: (organizationId: string) => Promise<{ error?: any }>;
  onUpdateAlternateSupervisor: (organizationId: string, email: string) => Promise<{ error?: any }>;
}

interface OrganizationStats {
  familyGroups: number;
  receipts: number;
  checkinSessions: number;
  surveyResponses: number;
}

export const OrganizationDetail = ({ 
  organization, 
  onBack, 
  onDelete, 
  onUpdateAlternateSupervisor 
}: OrganizationDetailProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<OrganizationStats>({
    familyGroups: 0,
    receipts: 0,
    checkinSessions: 0,
    surveyResponses: 0,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [newAlternateSupervisor, setNewAlternateSupervisor] = useState(
    organization.alternate_supervisor_email || ''
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const [familyGroupsRes, receiptsRes, checkinSessionsRes, surveyResponsesRes] = await Promise.all([
        supabase.from('family_groups').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('receipts').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('checkin_sessions').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('survey_responses').select('id', { count: 'exact' }).eq('organization_id', organization.id),
      ]);

      setStats({
        familyGroups: familyGroupsRes.count || 0,
        receipts: receiptsRes.count || 0,
        checkinSessions: checkinSessionsRes.count || 0,
        surveyResponses: surveyResponsesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching organization stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== organization.name) {
      toast({
        title: "Error",
        description: "Organization name does not match",
        variant: "destructive",
      });
      return;
    }

    const result = await onDelete(organization.id);
    if (!result.error) {
      onBack();
    }
  };

  const handleUpdateAlternateSupervisor = async () => {
    const result = await onUpdateAlternateSupervisor(organization.id, newAlternateSupervisor);
    if (!result.error) {
      // Success toast is handled in the hook
    }
  };

  useEffect(() => {
    fetchStats();
  }, [organization.id]);

  const ContactInfo = ({ label, name, email, phone }: { 
    label: string; 
    name?: string; 
    email?: string; 
    phone?: string; 
  }) => (
    <div className="space-y-1">
      <div className="font-medium text-base text-muted-foreground">{label}</div>
      {name && <div className="font-medium text-base">{name}</div>}
      {email && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Mail className="h-3 w-3" />
          {email}
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Phone className="h-3 w-3" />
          {phone}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-base">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-muted-foreground font-mono text-base">Code: {organization.code}</p>
          </div>
          <Badge variant="outline" className="text-base">
            Created: {new Date(organization.created_at).toLocaleDateString()}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Family Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.familyGroups}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Receipts</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.receipts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Check-in Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.checkinSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Survey Responses</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.surveyResponses}</div>
            </CardContent>
          </Card>
        </div>

        {/* Setup Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Setup</CardTitle>
            <CardDescription className="text-base">Manage setup data for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 text-base"
                onClick={() => navigate(`/supervisor/organization/${organization.id}/family-groups`)}
              >
                <Users className="h-5 w-5" />
                <span className="text-base">Family Groups</span>
                <span className="text-base text-muted-foreground">{stats.familyGroups} groups</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 text-base"
                onClick={() => navigate(`/supervisor/organization/${organization.id}/financial`)}
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-base">Financial Setup</span>
                <span className="text-base text-muted-foreground">{stats.receipts} receipts</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 text-base"
                onClick={() => navigate(`/supervisor/organization/${organization.id}/reservation`)}
              >
                <Home className="h-5 w-5" />
                <span className="text-base">Reservation Setup</span>
                <span className="text-base text-muted-foreground">Property details</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Organization Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription className="text-base">Key contacts for this organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ContactInfo
                label="Administrator"
                name={organization.admin_name}
                email={organization.admin_email}
                phone={organization.admin_phone}
              />
              
              <Separator />
              
              <ContactInfo
                label="Treasurer"
                name={organization.treasurer_name}
                email={organization.treasurer_email}
                phone={organization.treasurer_phone}
              />
              
              <Separator />
              
              <ContactInfo
                label="Calendar Keeper"
                name={organization.calendar_keeper_name}
                email={organization.calendar_keeper_email}
                phone={organization.calendar_keeper_phone}
              />
            </CardContent>
          </Card>

          {/* Management */}
          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
              <CardDescription className="text-base">Supervisor and organization management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alternate Supervisor */}
              <div className="space-y-2">
                <label className="text-base font-medium">Alternate Supervisor Email</label>
                <div className="flex gap-2">
                  <Input
                    value={newAlternateSupervisor}
                    onChange={(e) => setNewAlternateSupervisor(e.target.value)}
                    placeholder="Enter supervisor email"
                    type="email"
                    className="text-base placeholder:text-base"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleUpdateAlternateSupervisor}
                    disabled={newAlternateSupervisor === organization.alternate_supervisor_email}
                    className="text-base"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Delete Organization */}
              <div className="space-y-2">
                <label className="text-base font-medium text-destructive">Danger Zone</label>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full text-base">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Organization Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Organization Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all data 
                        associated with this organization including family groups, receipts, 
                        check-in sessions, and survey responses.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <label className="text-base font-medium">
                        Type "{organization.name}" to confirm:
                      </label>
                      <Input
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={organization.name}
                        className="text-base placeholder:text-base"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmation('')} className="text-base">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-base"
                        disabled={deleteConfirmation !== organization.name}
                      >
                        Delete Organization
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};