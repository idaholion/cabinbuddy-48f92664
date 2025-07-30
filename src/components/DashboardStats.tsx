import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Receipt, Camera, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  action?: {
    label: string;
    path: string;
  };
}

const StatCard = ({ title, value, description, icon, trend, action }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-4 w-4 text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp className={`h-3 w-3 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
      {action && (
        <Button variant="outline" size="sm" asChild className="mt-2 w-full">
          <Link to={action.path}>{action.label}</Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

export const DashboardStats = () => {
  // These would normally come from your data hooks
  const stats = [
    {
      title: "Upcoming Reservations",
      value: 3,
      description: "Next 30 days",
      icon: <Calendar className="h-4 w-4" />,
      trend: { value: 12, isPositive: true },
      action: { label: "View Calendar", path: "/calendar" }
    },
    {
      title: "Active Family Members",
      value: 8,
      description: "In your organization",
      icon: <Users className="h-4 w-4" />,
      action: { label: "Manage Members", path: "/select-organization" }
    },
    {
      title: "Pending Receipts",
      value: 2,
      description: "Need review",
      icon: <Receipt className="h-4 w-4" />,
      action: { label: "Add Receipt", path: "/add-receipt" }
    },
    {
      title: "Recent Photos",
      value: 12,
      description: "This month",
      icon: <Camera className="h-4 w-4" />,
      trend: { value: 8, isPositive: true },
      action: { label: "View Photos", path: "/photos" }
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};