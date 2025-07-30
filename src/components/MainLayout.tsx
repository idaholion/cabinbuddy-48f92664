import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';
import { AppHeader } from '@/components/AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1">
            <div className="p-3 sm:p-6">
              <AppBreadcrumbs />
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};