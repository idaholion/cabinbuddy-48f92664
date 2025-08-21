import { useLocation } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const RoleAwareBreadcrumbs = () => {
  const location = useLocation();
  const { activeRole, isSupervisor, canAccessSupervisorFeatures } = useRole();

  const getRoleBadge = () => {
    if (!isSupervisor) return null;
    
    return (
      <Badge 
        variant={canAccessSupervisorFeatures ? "default" : "secondary"}
        className="ml-2 flex items-center gap-1"
      >
        {canAccessSupervisorFeatures ? (
          <Shield className="h-3 w-3" />
        ) : (
          <UserCheck className="h-3 w-3" />
        )}
        {canAccessSupervisorFeatures ? 'Supervisor' : 'Admin'}
      </Badge>
    );
  };

  // Generate breadcrumb items based on current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const url = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Format segment name
    const formatName = (name: string) => {
      return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    return (
      <BreadcrumbItem key={url}>
        {isLast ? (
          <BreadcrumbPage>
            {formatName(segment)}
            {isLast && getRoleBadge()}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={url}>
            {formatName(segment)}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    );
  });

  return (
    <div className="flex items-center gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbItems.length > 0 && <BreadcrumbSeparator />}
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center">
              {item}
              {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};