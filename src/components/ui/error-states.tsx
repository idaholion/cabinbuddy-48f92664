import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </div>
            <CardDescription>
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

interface QueryErrorProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export const QueryError = ({ 
  error, 
  onRetry, 
  title = "Failed to load data",
  description = "There was an error loading the requested data. Please try again."
}: QueryErrorProps) => (
  <Card className="w-full">
    <CardHeader>
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <CardTitle className="text-destructive">{title}</CardTitle>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {process.env.NODE_ENV === 'development' && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Error:</strong> {error.message}
          </div>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ 
  icon = <AlertTriangle className="h-12 w-12 text-muted-foreground" />,
  title,
  description,
  action
}: EmptyStateProps) => (
  <Card className="w-full">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4">{icon}</div>
      <CardTitle className="mb-2">{title}</CardTitle>
      <CardDescription className="mb-4 max-w-sm">{description}</CardDescription>
      {action}
    </CardContent>
  </Card>
);