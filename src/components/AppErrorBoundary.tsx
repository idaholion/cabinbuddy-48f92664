import { Component, ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-boundary';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error with proper context
    logger.error(error.message, {
      component: 'AppErrorBoundary',
      action: 'componentDidCatch',
      errorInfo: errorInfo?.componentStack,
      route: window.location.pathname
    });

    // In production, error is already sent via logger
    if (process.env.NODE_ENV === 'production') {
      // Logger handles production monitoring
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorState
          error={this.state.error || new Error('Application error')}
          title="Application Error"
          onRetry={() => {
            this.setState({ hasError: false, error: undefined });
            window.location.reload();
          }}
          className="min-h-screen flex items-center justify-center p-4"
        />
      );
    }

    return this.props.children;
  }
}

// Wrapper to provide hooks context
export const AppErrorBoundary = ({ children, fallback }: Props) => {
  return (
    <AppErrorBoundaryClass fallback={fallback}>
      {children}
    </AppErrorBoundaryClass>
  );
};