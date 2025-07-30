import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileStackProps {
  children: ReactNode;
  className?: string;
  stackOnMobile?: boolean;
}

export const MobileStack = ({ 
  children, 
  className, 
  stackOnMobile = true 
}: MobileStackProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      stackOnMobile && isMobile 
        ? "flex flex-col space-y-3" 
        : "flex flex-row items-center space-x-4",
      className
    )}>
      {children}
    </div>
  );
};

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveGrid = ({ 
  children, 
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 }
}: ResponsiveGridProps) => {
  const gridClasses = cn(
    "grid gap-4",
    cols.mobile === 1 ? "grid-cols-1" : `grid-cols-${cols.mobile}`,
    cols.tablet === 2 ? "sm:grid-cols-2" : `sm:grid-cols-${cols.tablet}`,
    cols.desktop === 3 ? "lg:grid-cols-3" : `lg:grid-cols-${cols.desktop}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

interface TouchFriendlyButtonProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  [key: string]: any;
}

export const TouchFriendlyButton = ({ 
  children, 
  className,
  size = 'md',
  ...props 
}: TouchFriendlyButtonProps) => {
  const sizeClasses = {
    sm: 'min-h-[40px] min-w-[40px] px-3 py-2',
    md: 'min-h-[44px] min-w-[44px] px-4 py-3', 
    lg: 'min-h-[48px] min-w-[48px] px-6 py-4'
  };

  return (
    <button 
      className={cn(
        "touch-target",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface MobileHideProps {
  children: ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg';
}

export const MobileHide = ({ children, breakpoint = 'sm' }: MobileHideProps) => {
  const hideClass = breakpoint === 'sm' ? 'hidden sm:block' : 
                   breakpoint === 'md' ? 'hidden md:block' : 
                   'hidden lg:block';
  
  return (
    <div className={hideClass}>
      {children}
    </div>
  );
};

export const MobileShow = ({ children, breakpoint = 'sm' }: MobileHideProps) => {
  const showClass = breakpoint === 'sm' ? 'block sm:hidden' : 
                   breakpoint === 'md' ? 'block md:hidden' : 
                   'block lg:hidden';
  
  return (
    <div className={showClass}>
      {children}
    </div>
  );
};

interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
}

export const ResponsiveText = ({ 
  children, 
  className,
  size = 'base' 
}: ResponsiveTextProps) => {
  const sizeClass = `text-responsive-${size}`;
  
  return (
    <span className={cn(sizeClass, className)}>
      {children}
    </span>
  );
};