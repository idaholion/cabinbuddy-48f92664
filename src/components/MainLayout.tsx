import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';
import { ContextualHelp } from '@/components/ContextualHelp';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/home';

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          {/* Only show header with breadcrumbs on non-home pages */}
          {!isHomePage && (
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <AppBreadcrumbs />
                <ContextualHelp />
              </div>
            </div>
          )}
          <div className={isHomePage ? "p-0" : "p-6 pt-0"}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};