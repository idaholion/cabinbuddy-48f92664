import { Calendar, CheckCircle, Clock, Camera, Receipt, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  priority: 'high' | 'medium' | 'low';
}

const quickActions: QuickAction[] = [
  {
    id: 'calendar',
    title: 'Cabin Calendar',
    description: 'View reservations',
    path: '/calendar',
    icon: <Calendar className="h-5 w-5" />,
    color: 'bg-primary/10 text-primary hover:bg-primary/20',
    priority: 'high'
  },
  {
    id: 'check-in',
    title: 'Check In',
    description: 'Arrival check-in',
    path: '/check-in',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
    priority: 'high'
  },
  {
    id: 'daily-check',
    title: 'Daily Check',
    description: 'Maintenance check',
    path: '/daily-check-in',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    priority: 'medium'
  },
  {
    id: 'photos',
    title: 'Photos',
    description: 'Family memories',
    path: '/photos',
    icon: <Camera className="h-5 w-5" />,
    color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
    priority: 'medium'
  },
  {
    id: 'receipt',
    title: 'Receipt',
    description: 'Add expenses',
    path: '/add-receipt',
    icon: <Receipt className="h-5 w-5" />,
    color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
    priority: 'medium'
  },
  {
    id: 'rules',
    title: 'Rules',
    description: 'Cabin guidelines',
    path: '/cabin-rules',
    icon: <FileText className="h-5 w-5" />,
    color: 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20',
    priority: 'low'
  }
];

interface QuickActionsProps {
  variant?: 'grid' | 'horizontal' | 'compact';
  showAll?: boolean;
  className?: string;
}

export const QuickActions = ({ 
  variant = 'grid', 
  showAll = false,
  className 
}: QuickActionsProps) => {
  const actionsToShow = showAll 
    ? quickActions 
    : quickActions.filter(action => action.priority === 'high');

  if (variant === 'horizontal') {
    return (
      <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
        {actionsToShow.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            asChild
            className={cn("shrink-0", action.color)}
          >
            <Link to={action.path} className="flex items-center gap-2">
              {action.icon}
              <span className="hidden sm:inline">{action.title}</span>
            </Link>
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {actionsToShow.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            asChild
            className={cn("h-8", action.color)}
          >
            <Link to={action.path} className="flex items-center gap-1">
              {action.icon}
              <span className="text-xs">{action.title}</span>
            </Link>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3", className)}>
      {quickActions.map((action) => (
        <Card key={action.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Link to={action.path} className="block">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors",
                action.color
              )}>
                {action.icon}
              </div>
              <h3 className="font-medium text-sm mb-1">{action.title}</h3>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};