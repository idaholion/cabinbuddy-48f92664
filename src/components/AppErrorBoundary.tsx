import { Component, ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-boundary';

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
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Application Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }

    // In production, this would be sent to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
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