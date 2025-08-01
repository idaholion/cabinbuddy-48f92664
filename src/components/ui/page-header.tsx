import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  backgroundImage?: boolean;
}

export function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  children,
  backgroundImage = false 
}: PageHeaderProps) {
  const titleClasses = backgroundImage 
    ? "text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center flex items-center justify-center"
    : "text-4xl font-bold text-foreground mb-2 flex items-center";
    
  const subtitleClasses = backgroundImage
    ? "text-2xl text-primary text-center font-medium"
    : "text-lg text-muted-foreground";

  return (
    <div className="mb-8">
      {children}
      <h1 className={titleClasses}>
        {Icon && <Icon className="h-10 w-10 mr-3" />}
        {title}
      </h1>
      {subtitle && (
        <p className={subtitleClasses}>{subtitle}</p>
      )}
    </div>
  );
}