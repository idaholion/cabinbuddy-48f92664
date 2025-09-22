import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

import { ContextualHelp } from '@/components/ContextualHelp';
import { AiHelpAssistant } from '@/components/AiHelpAssistant';
import { GuestAccessBanner } from '@/components/GuestAccessBanner';
import { ReadOnlyModeProvider } from '@/components/ReadOnlyModeProvider';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/home';
  const isMobile = useIsMobile();

  return (
    <ReadOnlyModeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1">
            <GuestAccessBanner />
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
            {/* Only show header with contextual help on non-home pages */}
            {!isHomePage && (
              <div className="p-6 pb-0">
                <div className="flex items-center justify-end mb-4">
                  <ContextualHelp />
                </div>
              </div>
            )}
            <div className={isHomePage ? "p-0" : "p-6 pt-0"}>
              {children}
            </div>
          </main>
          {/* AI Help Assistant temporarily disabled - requires OpenAI API setup */}
        </div>
      </SidebarProvider>
    </ReadOnlyModeProvider>
  );
};