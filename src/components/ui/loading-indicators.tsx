import React from 'react';
import { Loader2, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
        {text && (
          <span className={cn('text-muted-foreground animate-pulse', textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex space-x-1">
          <div className={cn('bg-primary rounded-full animate-bounce', 
            size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
          )} style={{ animationDelay: '0ms' }} />
          <div className={cn('bg-primary rounded-full animate-bounce', 
            size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
          )} style={{ animationDelay: '150ms' }} />
          <div className={cn('bg-primary rounded-full animate-bounce', 
            size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
          )} style={{ animationDelay: '300ms' }} />
        </div>
        {text && (
          <span className={cn('text-muted-foreground', textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('bg-primary rounded-full animate-pulse', sizeClasses[size])} />
        {text && (
          <span className={cn('text-muted-foreground animate-pulse', textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="bg-muted rounded h-4 w-full mb-2" />
        <div className="bg-muted rounded h-4 w-3/4 mb-2" />
        <div className="bg-muted rounded h-4 w-1/2" />
      </div>
    );
  }

  return null;
};

// Status indicators for different states
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'pending';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className={cn('animate-spin text-blue-500', sizeClasses[size])} />;
      case 'success':
        return <CheckCircle2 className={cn('text-green-500', sizeClasses[size])} />;
      case 'error':
        return <AlertCircle className={cn('text-red-500', sizeClasses[size])} />;
      case 'warning':
        return <AlertCircle className={cn('text-yellow-500', sizeClasses[size])} />;
      case 'pending':
        return <Clock className={cn('text-gray-500', sizeClasses[size])} />;
      default:
        return null;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'pending':
        return 'text-gray-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {getIcon()}
      {text && (
        <span className={cn(getTextColor(), textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  );
};

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2 text-sm',
    lg: 'h-11 px-8 text-base'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      {loading ? (loadingText || children) : children}
    </button>
  );
};

// Progress indicator
interface ProgressIndicatorProps {
  value: number; // 0-100
  text?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  text,
  showPercentage = true,
  size = 'md',
  className
}) => {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn('w-full', className)}>
      {(text || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {text && (
            <span className={cn('text-muted-foreground', textSizeClasses[size])}>
              {text}
            </span>
          )}
          {showPercentage && (
            <span className={cn('text-muted-foreground', textSizeClasses[size])}>
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full', heightClasses[size])}>
        <div
          className={cn('bg-primary rounded-full transition-all duration-300', heightClasses[size])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

// Skeleton loader for content
interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  lines = 3,
  className
}) => {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="bg-muted rounded h-4"
          style={{
            width: `${Math.random() * 40 + 60}%` // Random width between 60-100%
          }}
        />
      ))}
    </div>
  );
};