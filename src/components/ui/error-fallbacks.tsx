import React from 'react';
import { AlertTriangle, WifiOff, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
}

export const ErrorFallback = ({
  error,
  resetErrorBoundary,
  title = "Something went wrong",
  description = "We encountered an unexpected error. Please try again."
}: ErrorFallbackProps) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === 'development' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Debug Info</AlertTitle>
            <AlertDescription className="text-sm font-mono">
              {error.message}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          {resetErrorBoundary && (
            <Button onClick={resetErrorBoundary} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

interface NetworkErrorProps {
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export const NetworkError = ({
  onRetry,
  title = "Connection Error",
  description = "Unable to connect to the server. Please check your internet connection and try again."
}: NetworkErrorProps) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <WifiOff className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  </div>
);

interface DataNotFoundProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const DataNotFound = ({
  title,
  description,
  action,
  icon = <AlertTriangle className="h-12 w-12 text-muted-foreground" />
}: DataNotFoundProps) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4">{icon}</div>
        <CardTitle className="mb-2">{title}</CardTitle>
        <CardDescription className="mb-4">{description}</CardDescription>
        {action}
      </CardContent>
    </Card>
  </div>
);

// Inline error states for smaller components
export const InlineError = ({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void; 
}) => (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription className="flex items-center justify-between">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </AlertDescription>
  </Alert>
);

export const InlineLoading = ({ message = "Loading..." }: { message?: string }) => (
  <Alert>
    <RefreshCw className="h-4 w-4 animate-spin" />
    <AlertTitle>Loading</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);