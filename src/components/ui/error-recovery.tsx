import React from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft, Mail, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLaunchAnalytics } from '@/hooks/useLaunchAnalytics';

interface ErrorWithRecoveryProps {
  error?: Error | string;
  title?: string;
  description?: string;
  showRetry?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  showSupport?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export const ErrorWithRecovery: React.FC<ErrorWithRecoveryProps> = ({
  error,
  title = "Something went wrong",
  description,
  showRetry = true,
  showHome = true,
  showBack = false,
  showSupport = true,
  onRetry,
  onBack,
  className
}) => {
  const { trackError, trackFeatureUsed } = useLaunchAnalytics();

  React.useEffect(() => {
    // Track error for analytics
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      trackError(errorMessage, { 
        title, 
        description,
        stack: error instanceof Error ? error.stack : undefined 
      });
    }
  }, [error, title, description, trackError]);

  const handleRetry = () => {
    trackFeatureUsed('error_recovery', { action: 'retry', error: String(error) });
    onRetry?.();
  };

  const handleHome = () => {
    trackFeatureUsed('error_recovery', { action: 'home', error: String(error) });
    window.location.href = '/';
  };

  const handleBack = () => {
    trackFeatureUsed('error_recovery', { action: 'back', error: String(error) });
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleSupport = () => {
    trackFeatureUsed('error_recovery', { action: 'support', error: String(error) });
    // Open feedback dialog or mailto
    const subject = encodeURIComponent(`Error Report: ${title}`);
    const body = encodeURIComponent(`
Error Details:
- Title: ${title}
- Description: ${description || 'No description provided'}
- Error: ${error || 'No error details'}
- Page: ${window.location.pathname}
- Time: ${new Date().toISOString()}
- User Agent: ${navigator.userAgent}

Please describe what you were trying to do when this error occurred:

    `);
    window.location.href = `mailto:support@cabinbuddy.com?subject=${subject}&body=${body}`;
  };

  const errorMessage = error instanceof Error ? error.message : String(error);
  const displayDescription = description || getErrorDescription(errorMessage);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {displayDescription}
        </p>

        {error && process.env.NODE_ENV === 'development' && (
          <Alert>
            <Bug className="h-4 w-4" />
            <AlertDescription className="font-mono text-xs">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {showRetry && (
            <Button 
              onClick={handleRetry}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {showBack && (
            <Button 
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          )}
          
          {showHome && (
            <Button 
              variant="outline"
              onClick={handleHome}
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          )}
          
          {showSupport && (
            <Button 
              variant="ghost"
              onClick={handleSupport}
              className="flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Network error component
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorWithRecovery
    title="Connection Problem"
    description="Unable to connect to the server. Please check your internet connection and try again."
    error="Network error"
    showRetry={true}
    showHome={false}
    showBack={false}
    onRetry={onRetry}
  />
);

// Permission error component  
export const PermissionError: React.FC = () => (
  <ErrorWithRecovery
    title="Access Denied"
    description="You don't have permission to access this resource. Please contact your administrator."
    error="Permission denied"
    showRetry={false}
    showHome={true}
    showBack={true}
    showSupport={true}
  />
);

// Not found error component
export const NotFoundError: React.FC<{ resource?: string }> = ({ resource = "page" }) => (
  <ErrorWithRecovery
    title={`${resource} Not Found`}
    description={`The ${resource.toLowerCase()} you're looking for doesn't exist or has been moved.`}
    error="404 Not Found"
    showRetry={false}
    showHome={true}
    showBack={true}
    showSupport={false}
  />
);

// Helper function to get user-friendly error descriptions
function getErrorDescription(errorMessage: string): string {
  const errorMappings: Record<string, string> = {
    'Network error': 'Please check your internet connection and try again.',
    'Permission denied': 'You don\'t have permission to perform this action.',
    'Not found': 'The requested resource could not be found.',
    'Validation error': 'Please check your input and try again.',
    'Server error': 'Our servers are experiencing issues. Please try again in a few moments.',
    'Authentication failed': 'Please log in again to continue.',
    'Session expired': 'Your session has expired. Please log in again.',
    'File too large': 'The file you\'re trying to upload is too large.',
    'Invalid format': 'The file format is not supported.',
    'Database error': 'We\'re experiencing technical difficulties. Please try again later.',
  };

  // Check for specific error patterns
  for (const [pattern, description] of Object.entries(errorMappings)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return description;
    }
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}