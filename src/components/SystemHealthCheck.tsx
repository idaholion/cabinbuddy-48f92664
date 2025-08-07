import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Clock, XCircle, TrendingUp, TrendingDown } from "lucide-react";

interface SystemHealthMetrics {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeUsers: number;
  databaseConnections: number;
}

interface SystemHealthCheckProps {
  metrics: SystemHealthMetrics;
  onRefresh: () => void;
  loading?: boolean;
}

export const SystemHealthCheck = ({ metrics, onRefresh, loading = false }: SystemHealthCheckProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">System Health</CardTitle>
          <CardDescription>Real-time system monitoring</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? "Checking..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Status</span>
          <Badge className={getStatusColor(metrics.status)}>
            {getStatusIcon(metrics.status)}
            <span className="ml-1 capitalize">{metrics.status}</span>
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Uptime</p>
            <p className="text-lg font-semibold">{formatUptime(metrics.uptime)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Response Time</p>
            <div className="flex items-center space-x-1">
              <p className="text-lg font-semibold">{metrics.responseTime}ms</p>
              {metrics.responseTime < 200 ? (
                <TrendingDown className="h-3 w-3 text-success" />
              ) : (
                <TrendingUp className="h-3 w-3 text-warning" />
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Error Rate</p>
            <div className="flex items-center space-x-1">
              <p className="text-lg font-semibold">{(metrics.errorRate * 100).toFixed(2)}%</p>
              {metrics.errorRate < 0.01 ? (
                <TrendingDown className="h-3 w-3 text-success" />
              ) : (
                <TrendingUp className="h-3 w-3 text-destructive" />
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-lg font-semibold">{metrics.activeUsers}</p>
          </div>
        </div>

        {/* Warnings */}
        {metrics.status !== 'healthy' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {metrics.status === 'warning' 
                ? "System is experiencing minor issues. Monitoring closely."
                : "Critical issues detected. Immediate attention required."
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};