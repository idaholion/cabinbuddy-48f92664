import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Link } from "react-router-dom";

export const AppBreadcrumbs = () => {
  const breadcrumbs = useBreadcrumbs();

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
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
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