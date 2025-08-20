import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BreadcrumbItem {
  title: string;
  href?: string;
  isActive?: boolean;
}

export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  const params = useParams();
  const [organizationName, setOrganizationName] = useState<string>("");
  
  // Fetch organization name when organizationId is available
  useEffect(() => {
    const fetchOrganizationName = async () => {
      if (params.organizationId) {
        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', params.organizationId)
            .single();
          
          if (data && !error) {
            setOrganizationName(data.name);
          }
        } catch (error) {
          console.error('Error fetching organization:', error);
        }
      }
    };

    fetchOrganizationName();
  }, [params.organizationId]);

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Base breadcrumb for dashboard
    const breadcrumbs: BreadcrumbItem[] = [
      { title: "Dashboard", href: "/home" }
    ];

    // Route-specific breadcrumb generation
    if (path === "/home") {
      return [{ title: "Dashboard", isActive: true }];
    }

    // Setup pages
    if (path.startsWith("/setup") || path.includes("setup")) {
      breadcrumbs.push({ title: "Setup", href: "/setup" });
      
      if (path === "/family-setup") {
        breadcrumbs.push({ title: "Family Setup", isActive: true });
      } else if (path === "/family-group-setup") {
        breadcrumbs.push({ title: "Family Group Setup", isActive: true });
      } else if (path === "/use-fee-setup") {
        breadcrumbs.push({ title: "Use Fee Setup", isActive: true });
      } else if (path === "/reservation-setup") {
        breadcrumbs.push({ title: "Reservation Setup", isActive: true });
      } else if (path === "/setup") {
        breadcrumbs[breadcrumbs.length - 1].isActive = true;
      }
      
      return breadcrumbs;
    }

    // Supervisor section
    if (path.startsWith("/supervisor")) {
      breadcrumbs.push({ title: "Supervisor", href: "/supervisor" });
      
      if (path === "/supervisor") {
        breadcrumbs[breadcrumbs.length - 1].isActive = true;
      } else if (params.organizationId) {
        // Organization-specific supervisor pages
        const orgName = organizationName || "Organization";
        breadcrumbs.push({ 
          title: orgName, 
          href: `/supervisor/organization/${params.organizationId}` 
        });
        
        if (path.includes("/family-groups")) {
          breadcrumbs.push({ title: "Family Groups", isActive: true });
        } else if (path.includes("/financial")) {
          breadcrumbs.push({ title: "Financial Management", isActive: true });
        } else if (path.includes("/reservation")) {
          breadcrumbs.push({ title: "Reservation Management", isActive: true });
        }
      }
      
      return breadcrumbs;
    }

    // Cabin management pages
    if (path === "/calendar") {
      breadcrumbs.push({ title: "Cabin Calendar", isActive: true });
    } else if (path === "/check-in") {
      breadcrumbs.push({ title: "Check In", isActive: true });
    } else if (path === "/daily-check-in") {
      breadcrumbs.push({ title: "Daily Check In", isActive: true });
    } else if (path === "/add-receipt") {
      breadcrumbs.push({ title: "Add Receipt", isActive: true });
    } else if (path === "/shopping-list") {
      breadcrumbs.push({ title: "Shopping List", isActive: true });
    } else if (path === "/cabin-rules") {
      breadcrumbs.push({ title: "Cabin Rules", isActive: true });
    } else if (path === "/documents") {
      breadcrumbs.push({ title: "Documents", isActive: true });
    } else if (path === "/cabin-seasonal-docs") {
      breadcrumbs.push({ title: "Seasonal Documents", isActive: true });
    } else if (path === "/checkout-list") {
      breadcrumbs.push({ title: "Checkout List", isActive: true });
    } else if (path === "/checkout-final") {
      breadcrumbs.push({ title: "Final Checkout", isActive: true });
    } else if (path === "/photos") {
      breadcrumbs.push({ title: "Photo Sharing", isActive: true });
    } else if (path === "/select-family-group") {
      breadcrumbs.push({ title: "Select Family Group", isActive: true });
    } else if (path === "/select-organization") {
      breadcrumbs.push({ title: "Select Organization", isActive: true });
    } else if (path === "/finance-reports") {
      breadcrumbs.push({ title: "Financial Dashboard", isActive: true });
    } else if (path === "/calendar-keeper-management") {
      breadcrumbs.push({ title: "Calendar Keeper Management", isActive: true });
    } else if (path === "/financial-review") {
      breadcrumbs.push({ title: "Financial Review", isActive: true });
    }

    return breadcrumbs;
  };

  return generateBreadcrumbs();
};