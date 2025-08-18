import { ReactNode } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bug, ArrowLeft } from 'lucide-react';

interface DebugRouteProps {
  children: ReactNode;
  fallbackPath?: string;
}

export const DebugRoute = ({ children, fallbackPath = '/' }: DebugRouteProps) => {
  const { user } = useAuth();
  const { isSupervisor, loading } = useSupervisor();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isDebugMode = location.search.includes('debug=true');
  
  // If not in debug mode, render children normally
  if (!isDebugMode) {
    return <>{children}</>;
  }
  
  // If in debug mode, check supervisor status
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user || !isSupervisor) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  // Render with debug banner
  return (
    <div className="min-h-screen">
      {/* Debug Banner */}
      <Alert className="rounded-none border-orange-200 bg-orange-50 border-b-2">
        <Bug className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-orange-800 font-medium">
            🐛 DEBUG MODE ACTIVE - You are viewing this screen as a supervisor for testing purposes
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/supervisor')}
            className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Supervisor
          </Button>
        </AlertDescription>
      </Alert>
      
      {/* Original Content */}
      <div className="pt-0">
        {children}
      </div>
    </div>
  );
};