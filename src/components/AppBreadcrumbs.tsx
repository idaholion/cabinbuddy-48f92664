import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";

export const AppBreadcrumbs = () => {
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }

  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const parentPage = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        {parentPage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(parentPage.href || '/home')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                <BreadcrumbItem>
                  {crumb.isActive ? (
                    <BreadcrumbPage className="font-medium">
                      {crumb.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link 
                        to={crumb.href || "#"} 
                        className="hover:text-primary transition-colors"
                      >
                        {index === 0 && <Home className="h-3 w-3 mr-1" />}
                        {crumb.title}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Page Status/Info */}
      <div className="flex items-center gap-2">
        {currentPage?.title.includes('Supervisor') && (
          <Badge variant="secondary">Admin</Badge>
        )}
        {currentPage?.title.includes('Setup') && (
          <Badge variant="outline">Configuration</Badge>
        )}
      </div>
    </div>
  );
};