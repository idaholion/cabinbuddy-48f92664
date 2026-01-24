import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { CBHelpButton } from '@/components/CBHelpButton';
import { GuestAccessBanner } from '@/components/GuestAccessBanner';
import { TestOrganizationBanner } from '@/components/TestOrganizationBanner';
import { ReadOnlyModeProvider } from '@/components/ReadOnlyModeProvider';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/home';
  const isFAQPage = location.pathname === '/faq';
  const isMobile = useIsMobile();

  return (
    <ReadOnlyModeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1">
            <GuestAccessBanner />
            <TestOrganizationBanner />
            {/* Mobile sidebar trigger - only visible on mobile screens */}
            {isMobile === true && (
              <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger className="h-8 w-8" />
                <h1 className="text-lg font-semibold truncate">
                  {isHomePage ? 'Home' : location.pathname.split('/').pop()?.replace('-', ' ') || 'CabinBuddy'}
                </h1>
                <div className="w-8" /> {/* Spacer for balance */}
              </div>
            )}
            <div className={isHomePage ? "p-0" : "p-6"}>
              {children}
            </div>
          </main>
          {/* CB Help Button - Unified help system */}
          <CBHelpButton />
        </div>
      </SidebarProvider>
    </ReadOnlyModeProvider>
  );
};