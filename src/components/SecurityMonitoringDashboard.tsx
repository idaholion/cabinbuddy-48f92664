import { useState } from 'react';
import { Shield, AlertTriangle, Clock, User, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

export const SecurityMonitoringDashboard = () => {
  const { securityData, clearSecurityEvents, checkOrganizationAccess } = useSecurityMonitoring();
  const { isAdmin } = useOrgAdmin();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show to admins or when there are security issues
  if (!isAdmin && !securityData.hasRecentErrors) {
    return null;
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'access_denied':
        return <Shield className="h-4 w-4 text-destructive" />;
      case 'organization_mismatch':
        return <Database className="h-4 w-4 text-warning" />;
      case 'permission_error':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getEventBadgeVariant = (type: string) => {
    switch (type) {
      case 'access_denied':
        return 'destructive';
      case 'organization_mismatch':
        return 'outline';
      case 'permission_error':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle className="text-lg">Security Status</CardTitle>
                {securityData.hasRecentErrors && (
                  <Badge variant="destructive" className="ml-2">
                    {securityData.events.length} Events
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={securityData.organizationAccess.hasAccess ? 'default' : 'destructive'}
                >
                  {securityData.organizationAccess.hasAccess ? 'Access OK' : 'Access Issues'}
                </Badge>
              </div>
            </div>
          </CollapsibleTrigger>
          
          {!isExpanded && securityData.hasRecentErrors && (
            <CardDescription className="text-sm text-muted-foreground">
              Recent security events detected. Click to view details.
            </CardDescription>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className="space-y-4">
              {/* Organization Access Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Organization Access</span>
                </div>
                <div className="flex items-center gap-2">
                  {securityData.organizationAccess.hasAccess ? (
                    <Badge variant="default">Connected</Badge>
                  ) : (
                    <Badge variant="destructive">
                      {securityData.organizationAccess.error || 'No Access'}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkOrganizationAccess}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Security Events */}
              {securityData.events.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Recent Security Events</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSecurityEvents}
                    >
                      Clear Events
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {securityData.events.map((event, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                      >
                        {getEventIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getEventBadgeVariant(event.type)}>
                              {event.type.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {event.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {event.message}
                          </p>
                          {event.details && (
                            <details className="mt-1">
                              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                View Details
                              </summary>
                              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Only Information */}
              {isAdmin && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Administrator View</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You have administrator privileges. Security events and access issues 
                    are automatically logged for audit purposes.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};