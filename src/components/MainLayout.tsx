import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';
import { ContextualHelp } from '@/components/ContextualHelp';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <AppBreadcrumbs />
              <ContextualHelp />
            </div>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};