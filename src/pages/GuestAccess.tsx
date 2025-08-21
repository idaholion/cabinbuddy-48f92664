import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGuestAccess } from '@/contexts/GuestAccessContext';
import { GuestAccessBanner } from '@/components/GuestAccessBanner';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { useGuestOrganization } from '@/hooks/useGuestOrganization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function GuestAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { validateGuestAccess, isValidating, isGuestMode } = useGuestAccess();
  const { organizationData, loading, error } = useGuestOrganization();
  const [validationComplete, setValidationComplete] = useState(false);

  useEffect(() => {
    const orgId = searchParams.get('org');
    const token = searchParams.get('token');

    if (orgId && token && !isGuestMode && !validationComplete) {
      validateGuestAccess(orgId, token).then((success) => {
        setValidationComplete(true);
        if (!success) {
          // Redirect to home if validation fails
          setTimeout(() => navigate('/'), 3000);
        }
      });
    } else if (!orgId || !token) {
      // No guest parameters, redirect to home
      navigate('/');
    }
  }, [searchParams, validateGuestAccess, isGuestMode, navigate, validationComplete]);

  if (isValidating || !validationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Validating guest access...</p>
        </div>
      </div>
    );
  }

  if (!isGuestMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              The guest access link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <GuestAccessBanner />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">Loading organization data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <GuestAccessBanner />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Error Loading Data</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { organization, familyGroups = [], features = [] } = organizationData || {};

  return (
    <div className="min-h-screen bg-background">
      <GuestAccessBanner />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Organization Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">{organization?.name}</h1>
            <Badge variant="secondary">{organization?.access_type?.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xl text-muted-foreground">
            Organization Code: <span className="font-mono font-semibold">{organization?.code}</span>
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Welcome to the preview of our cabin sharing organization. 
            Explore our features and see how we manage our shared property.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Family Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyGroups.length}</div>
              <p className="text-xs text-muted-foreground">
                Active family groups
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Features</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{features.length}</div>
              <p className="text-xs text-muted-foreground">
                Available features
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Access Type</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {organization?.access_type?.replace('_', ' ')}
              </div>
              <p className="text-xs text-muted-foreground">
                Preview mode active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Showcase */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Our Features</h2>
            <p className="text-muted-foreground">
              Explore the tools and features we use to manage our shared cabin
            </p>
          </div>
          <FeatureShowcase variant="public" />
        </div>

        {/* Family Groups Preview */}
        {familyGroups.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Family Groups</h2>
              <p className="text-muted-foreground">
                Meet the families that share this cabin
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyGroups.slice(0, 6).map((group: any) => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{group.name}</span>
                      {group.color && (
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {group.host_members?.length || 0} group members
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {familyGroups.length > 6 && (
              <p className="text-center text-muted-foreground">
                And {familyGroups.length - 6} more family groups...
              </p>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary/5 to-primary/10 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">
            Join our cabin sharing community and enjoy all the features you've seen in this preview.
          </p>
          <Button size="lg" onClick={() => window.open('/auth', '_blank')}>
            Sign Up for Full Access
          </Button>
        </div>
      </div>
    </div>
  );
}