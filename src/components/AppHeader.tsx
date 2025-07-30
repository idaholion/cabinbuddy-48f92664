import { ReactNode } from 'react';
import { Calendar, Receipt, CheckCircle, Home, DollarSign, Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickActions as QuickActionsComponent } from '@/components/QuickActions';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  url: string;
  icon: ReactNode;
  variant?: 'default' | 'secondary' | 'outline';
}

const quickActions: QuickAction[] = [
  { title: 'Calendar', url: '/enhanced-calendar', icon: <Calendar className="h-4 w-4" />, variant: 'default' },
  { title: 'Check In', url: '/check-in', icon: <CheckCircle className="h-4 w-4" />, variant: 'outline' },
  { title: 'Add Receipt', url: '/add-receipt', icon: <Receipt className="h-4 w-4" />, variant: 'outline' },
  { title: 'Dashboard', url: '/home', icon: <Home className="h-4 w-4" />, variant: 'outline' },
  { title: 'Financial', url: '/financial-review', icon: <DollarSign className="h-4 w-4" />, variant: 'outline' },
];

const UserMenu = () => {
  const { user, signOut } = useAuth();
  
  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.user_metadata?.first_name 
                ? user.user_metadata.first_name.charAt(0).toUpperCase() 
                : getInitials(user?.email || 'U')
              }
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {user?.user_metadata?.first_name || 'User'}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user?.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const QuickActions = () => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Quick actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {quickActions.map((action) => (
            <DropdownMenuItem key={action.url} asChild>
              <NavLink to={action.url} className="flex items-center">
                {action.icon}
                <span className="ml-2">{action.title}</span>
              </NavLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="hidden md:flex items-center space-x-2">
      {quickActions.slice(0, 4).map((action) => (
        <Button
          key={action.url}
          variant={action.variant as any}
          size="sm"
          asChild
          className="h-8"
        >
          <NavLink
            to={action.url}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2",
                isActive && "bg-accent text-accent-foreground"
              )
            }
          >
            {action.icon}
            <span className="hidden lg:inline">{action.title}</span>
          </NavLink>
        </Button>
      ))}
    </div>
  );
};

export const AppHeader = () => {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Left side - Sidebar toggle and organization switcher */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          
          <div className="hidden sm:block">
            <OrganizationSwitcher />
          </div>
        </div>

        {/* Center - Search and Quick actions */}
        <div className="flex items-center justify-center flex-1 max-w-2xl mx-4 gap-4">
          <div className="hidden md:block flex-1 max-w-sm">
            <GlobalSearch />
          </div>
          <QuickActions />
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          <div className="sm:hidden">
            <OrganizationSwitcher />
          </div>
          
          <UserMenu />
        </div>
      </div>
    </header>
  );
};