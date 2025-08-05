import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

interface MissingRoleHolder {
  role: string;
  name?: string;
  email: string;
}

export const OrganizationRoleReminder = () => {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const [missingRoleHolders, setMissingRoleHolders] = useState<MissingRoleHolder[]>([]);

  useEffect(() => {
    if (!organization || !familyGroups.length) return;

    const missing: MissingRoleHolder[] = [];
    
    // Get all emails from family groups (leads and host members)
    const allFamilyGroupEmails = new Set<string>();
    
    familyGroups.forEach(group => {
      if (group.lead_email) {
        allFamilyGroupEmails.add(group.lead_email.toLowerCase());
      }
      
      if (group.host_members) {
        group.host_members.forEach((member: any) => {
          if (member.email) {
            allFamilyGroupEmails.add(member.email.toLowerCase());
          }
        });
      }
    });

    // Check each organizational role
    const rolesToCheck = [
      { role: 'Administrator', name: organization.admin_name, email: organization.admin_email },
      { role: 'Treasurer', name: organization.treasurer_name, email: organization.treasurer_email },
      { role: 'Calendar Keeper', name: organization.calendar_keeper_name, email: organization.calendar_keeper_email }
    ];

    rolesToCheck.forEach(({ role, name, email }) => {
      if (email && !allFamilyGroupEmails.has(email.toLowerCase())) {
        missing.push({ role, name, email });
      }
    });

    setMissingRoleHolders(missing);
  }, [organization, familyGroups]);

  if (!missingRoleHolders.length) return null;

  return (
    <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Organizational Role Reminder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
          <Users className="h-4 w-4" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            The following organizational role holders are not yet members of any family group. 
            Please ensure they sign up as family group members to participate in reservations.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          {missingRoleHolders.map((roleHolder, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700">
                    {roleHolder.role}
                  </Badge>
                  {roleHolder.name && (
                    <span className="font-medium text-sm">{roleHolder.name}</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{roleHolder.email}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground mt-3 p-2 bg-white dark:bg-gray-900 rounded">
          <strong>Next Steps:</strong> Each person listed above should sign up as either a family group lead 
          or host member in one of your family groups. They can do this by logging in and completing 
          the family group setup process.
        </div>
      </CardContent>
    </Card>
  );
};