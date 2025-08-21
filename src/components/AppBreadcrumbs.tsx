import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck } from 'lucide-react';
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import { Link } from "react-router-dom";

export const AppBreadcrumbs = () => {
  const breadcrumbs = useBreadcrumbs();
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

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {crumb.isActive ? (
                <BreadcrumbPage>
                  {crumb.title}
                  {index === breadcrumbs.length - 1 && getRoleBadge()}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href || "#"}>{crumb.title}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};